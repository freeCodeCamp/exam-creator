use http::StatusCode;
use mongodb::bson::oid::ObjectId;
use rand::seq::SliceRandom;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

use crate::database::prisma::{
    ExamEnvironmentAnswer, ExamEnvironmentConfig, ExamEnvironmentGeneratedExam,
    ExamEnvironmentGeneratedMultipleChoiceQuestion, ExamEnvironmentGeneratedQuestionSet,
    ExamEnvironmentMultipleChoiceQuestion, ExamEnvironmentQuestionSet,
    ExamEnvironmentQuestionSetConfig,
};
use crate::errors::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExamInput {
    pub id: ObjectId,
    #[serde(rename = "questionSets")]
    pub question_sets: Vec<ExamEnvironmentQuestionSet>,
    pub config: ExamEnvironmentConfig,
}

#[derive(Debug, Clone)]
struct QuestionSetConfigWithQuestions {
    config: ExamEnvironmentQuestionSetConfig,
    question_sets: Vec<ExamEnvironmentQuestionSet>,
}

// TODO: BUG - if no exam is ever generated, then the global stream timeout never happens
const TIMEOUT_IN_MS: u64 = 5_000;

/// Generates an exam for the user, based on the exam configuration.
pub fn generate_exam(exam: ExamInput) -> Result<ExamEnvironmentGeneratedExam, Error> {
    let start_time = Instant::now();
    let timeout = Duration::from_millis(TIMEOUT_IN_MS);

    let mut rng = rand::rng();

    // Shuffle question sets and their questions/answers
    let mut shuffled_question_sets: Vec<ExamEnvironmentQuestionSet> = exam
        .question_sets
        .into_iter()
        .map(|mut qs| {
            let mut shuffled_questions: Vec<ExamEnvironmentMultipleChoiceQuestion> = qs
                .questions
                .into_iter()
                .filter(|q| !q.deprecated)
                .map(|mut q| {
                    q.answers.shuffle(&mut rng);
                    q
                })
                .collect();
            shuffled_questions.shuffle(&mut rng);
            qs.questions = shuffled_questions;
            qs
        })
        .collect();
    shuffled_question_sets.shuffle(&mut rng);

    if exam.config.question_sets.is_empty() {
        return Err(Error::Generation(StatusCode::BAD_REQUEST,format!(
            "{}: Invalid exam config - no question sets config.",
            exam.id
        )));
    }

    // Convert question set config by type: [[all question sets of type], [another type], ...]
    let mut type_converted_question_sets_config: Vec<Vec<ExamEnvironmentQuestionSetConfig>> =
        Vec::new();
    for config in exam.config.question_sets.iter() {
        if let Some(type_group) = type_converted_question_sets_config
            .iter_mut()
            .find(|group| group.first().map(|c| &c._type) == Some(&config._type))
        {
            type_group.push(config.clone());
        } else {
            type_converted_question_sets_config.push(vec![config.clone()]);
        }
    }

    // Sort each type group randomly (heuristic for retry)
    for group in type_converted_question_sets_config.iter_mut() {
        group.shuffle(&mut rng);
    }

    let sorted_question_sets_config: Vec<ExamEnvironmentQuestionSetConfig> =
        type_converted_question_sets_config
            .into_iter()
            .flatten()
            .collect();

    // Move all questions from set that are used to fulfill tag config.
    let mut question_sets_config_with_questions: Vec<QuestionSetConfigWithQuestions> =
        sorted_question_sets_config
            .into_iter()
            .map(|config| QuestionSetConfigWithQuestions {
                config,
                question_sets: Vec::new(),
            })
            .collect();

    // Sort tag config by number of tags in descending order.
    let mut sorted_tag_config = exam.config.tags.clone();
    sorted_tag_config.sort_by(|a, b| b.group.len().cmp(&a.group.len()));

    // Main allocation loop
    'question_sets_config_loop: for qsc_with_qs in question_sets_config_with_questions.iter_mut() {
        'sorted_tag_config_loop: for tag_config in sorted_tag_config.iter_mut() {
            // Collect questions to remove (question_set_id, question_id)
            let mut questions_to_remove: Vec<(ObjectId, ObjectId)> = Vec::new();

            for question_set in shuffled_question_sets
                .iter_mut()
                .filter(|sqs| sqs._type == qsc_with_qs.config._type)
            {
                // If questionSet does not have enough questions for config, do not consider.
                if qsc_with_qs.config.number_of_questions > question_set.questions.len() as i64 {
                    continue;
                }
                // If tagConfig is finished, skip.
                if tag_config.number_of_questions == 0 {
                    continue 'sorted_tag_config_loop;
                }
                // If questionSetConfig has been fulfilled, skip.
                if is_question_set_config_fulfilled(qsc_with_qs) {
                    continue 'question_sets_config_loop;
                }

                // Store question_set id and metadata before mutable borrow
                let question_set_id = question_set.id;
                let question_set_type = question_set._type.clone();
                let question_set_context = question_set.context.clone();

                // Find question with at least all tags in the set.
                let questions: Vec<&mut ExamEnvironmentMultipleChoiceQuestion> = question_set
                    .questions
                    .iter_mut()
                    .filter(|q| tag_config.group.iter().all(|t| q.tags.contains(t)))
                    .collect();

                for question in questions {
                    // Does question fulfill criteria for questionSetConfig:
                    let number_of_correct_answers =
                        question.answers.iter().filter(|a| a.is_correct).count() as i64;
                    let number_of_incorrect_answers =
                        question.answers.iter().filter(|a| !a.is_correct).count() as i64;

                    if qsc_with_qs.config.number_of_correct_answers <= number_of_correct_answers
                        && qsc_with_qs.config.number_of_incorrect_answers
                            <= number_of_incorrect_answers
                    {
                        if is_question_set_config_fulfilled(qsc_with_qs) {
                            continue 'question_sets_config_loop;
                        }

                        // Push questionSet if it does not exist. Otherwise, just push question
                        let qscqs = qsc_with_qs
                            .question_sets
                            .iter_mut()
                            .find(|qs| qs.id == question_set_id);

                        let question_with_correct_number_of_answers =
                            get_question_with_random_answers(question, &qsc_with_qs.config)?;

                        if let Some(existing_qs) = qscqs {
                            if existing_qs.questions.len()
                                == qsc_with_qs.config.number_of_questions as usize
                            {
                                break;
                            }
                            existing_qs
                                .questions
                                .push(question_with_correct_number_of_answers);
                        } else {
                            if qsc_with_qs.question_sets.len()
                                == qsc_with_qs.config.number_of_set as usize
                            {
                                break;
                            }
                            // Create new question set from stored metadata
                            let new_question_set = ExamEnvironmentQuestionSet {
                                id: question_set_id,
                                _type: question_set_type.clone(),
                                context: question_set_context.clone(),
                                questions: vec![question_with_correct_number_of_answers],
                            };
                            qsc_with_qs.question_sets.push(new_question_set);
                        }

                        // Mark question for removal
                        questions_to_remove.push((question_set_id, question.id));

                        tag_config.number_of_questions -= 1;
                    }
                }
            }

            // Remove marked questions after iteration
            for (qs_id, q_id) in questions_to_remove {
                if let Some(qs) = shuffled_question_sets.iter_mut().find(|qs| qs.id == qs_id) {
                    qs.questions.retain(|q| q.id != q_id);
                }
            }
        }

        // Add questions to questionSetsConfigWithQuestions until fulfilled.
        while !is_question_set_config_fulfilled(qsc_with_qs) {
            if start_time.elapsed() > timeout {
                return Err(Error::Generation(StatusCode::REQUEST_TIMEOUT,format!(
                    "Unable to generate exam within {}ms",
                    TIMEOUT_IN_MS
                )));
            }

            // Ensure all questionSets ARE FULL
            if (qsc_with_qs.config.number_of_set as usize) > qsc_with_qs.question_sets.len() {
                let question_set = shuffled_question_sets
                    .iter()
                    .find(|qs| {
                        if qs._type == qsc_with_qs.config._type && qs.questions.len() >= qsc_with_qs.config.number_of_questions as usize
                            {
                                let questions: Vec<&ExamEnvironmentMultipleChoiceQuestion> = qs
                                    .questions
                                    .iter()
                                    .filter(|q| {
                                        let number_of_correct_answers =
                                            q.answers.iter().filter(|a| a.is_correct).count()
                                                as i64;
                                        let number_of_incorrect_answers =
                                            q.answers.iter().filter(|a| !a.is_correct).count()
                                                as i64;
                                        number_of_correct_answers
                                            >= qsc_with_qs.config.number_of_correct_answers
                                            && number_of_incorrect_answers
                                                >= qsc_with_qs.config.number_of_incorrect_answers
                                    })
                                    .collect();

                                return questions.len()
                                    >= qsc_with_qs.config.number_of_questions as usize;
                        }
                        
                        false
                    })
                    .cloned()
                    .ok_or_else(|| {
                        Error::Generation(StatusCode::BAD_REQUEST, format!(
                            "Invalid Exam Configuration for {}. Not enough questions for question type {:?}.",
                            exam.id, qsc_with_qs.config._type
                        ))
                    })?;

                // Remove questionSet from shuffledQuestionSets
                let question_set_id = question_set.id;
                shuffled_question_sets.retain(|qs| qs.id != question_set_id);

                let questions: Vec<ExamEnvironmentMultipleChoiceQuestion> = question_set
                    .questions
                    .iter()
                    .filter(|q| {
                        let number_of_correct_answers =
                            q.answers.iter().filter(|a| a.is_correct).count() as i64;
                        let number_of_incorrect_answers =
                            q.answers.iter().filter(|a| !a.is_correct).count() as i64;
                        number_of_correct_answers >= qsc_with_qs.config.number_of_correct_answers
                            && number_of_incorrect_answers
                                >= qsc_with_qs.config.number_of_incorrect_answers
                    })
                    .cloned()
                    .collect();

                let questions_with_correct_answers: Result<
                    Vec<ExamEnvironmentMultipleChoiceQuestion>,
                    Error,
                > = questions
                    .iter()
                    .map(|q| get_question_with_random_answers(q, &qsc_with_qs.config))
                    .collect();

                let mut question_set_with_correct_number_of_answers = question_set.clone();
                question_set_with_correct_number_of_answers.questions =
                    questions_with_correct_answers?;

                qsc_with_qs
                    .question_sets
                    .push(question_set_with_correct_number_of_answers);
            }

            // Ensure all existing questionSets have correct number of questions
            for question_set in qsc_with_qs.question_sets.iter_mut() {
                if (question_set.questions.len() as i64) < qsc_with_qs.config.number_of_questions {
                    let questions: Vec<ExamEnvironmentMultipleChoiceQuestion> =
                        shuffled_question_sets
                            .iter()
                            .find(|qs| qs.id == question_set.id)
                            .ok_or_else(|| {
                                Error::Generation(StatusCode::BAD_REQUEST, format!(
                                    "Invalid Exam Configuration for {}. Not enough questions for question type {:?}.",
                                    exam.id, qsc_with_qs.config._type
                                ))
                            })?
                            .questions
                            .iter()
                            .filter(|q| !question_set.questions.iter().any(|qsq| qsq.id == q.id))
                            .cloned()
                            .collect();

                    let questions_with_enough_answers: Vec<ExamEnvironmentMultipleChoiceQuestion> =
                        questions
                            .into_iter()
                            .filter(|q| {
                                let number_of_correct_answers =
                                    q.answers.iter().filter(|a| a.is_correct).count() as i64;
                                let number_of_incorrect_answers =
                                    q.answers.iter().filter(|a| !a.is_correct).count() as i64;
                                number_of_correct_answers
                                    >= qsc_with_qs.config.number_of_correct_answers
                                    && number_of_incorrect_answers
                                        >= qsc_with_qs.config.number_of_incorrect_answers
                            })
                            .collect();

                    // Push as many questions as needed to fulfill questionSetConfig
                    let num_to_add = (qsc_with_qs.config.number_of_questions as usize)
                        - question_set.questions.len();
                    let questions_to_add: Vec<ExamEnvironmentMultipleChoiceQuestion> =
                        questions_with_enough_answers
                            .into_iter()
                            .take(num_to_add)
                            .collect();

                    let questions_with_correct_answers: Result<
                        Vec<ExamEnvironmentMultipleChoiceQuestion>,
                        Error,
                    > = questions_to_add
                        .iter()
                        .map(|q| get_question_with_random_answers(q, &qsc_with_qs.config))
                        .collect();

                    question_set
                        .questions
                        .extend(questions_with_correct_answers?);

                    // Remove questions from shuffledQuestionSets
                    for q in questions_to_add.iter() {
                        if let Some(qs) = shuffled_question_sets
                            .iter_mut()
                            .find(|qs| qs.id == question_set.id)
                        {
                            qs.questions.retain(|qs_q| qs_q.id != q.id);
                        }
                    }
                }
            }
        }
    }

    // Verify all tag configs are fulfilled
    for tag_config in sorted_tag_config.iter() {
        if tag_config.number_of_questions > 0 {
            return Err(Error::Generation(StatusCode::BAD_REQUEST, format!(
                "Invalid Exam Configuration for exam \"{}\". Not enough questions for tag group \"{}\".",
                exam.id,
                tag_config.group.join(",")
            )));
        }
    }

    // Build the final generated exam structure
    let question_sets: Vec<ExamEnvironmentGeneratedQuestionSet> =
        question_sets_config_with_questions
            .into_iter()
            .flat_map(|qsc| {
                qsc.question_sets.into_iter().map(|qs| {
                    let questions: Vec<ExamEnvironmentGeneratedMultipleChoiceQuestion> = qs
                        .questions
                        .into_iter()
                        .map(|q| {
                            let answers: Vec<ObjectId> =
                                q.answers.into_iter().map(|a| a.id).collect();
                            ExamEnvironmentGeneratedMultipleChoiceQuestion { id: q.id, answers }
                        })
                        .collect();
                    ExamEnvironmentGeneratedQuestionSet {
                        id: qs.id,
                        questions,
                    }
                })
            })
            .collect();

    Ok(ExamEnvironmentGeneratedExam {
        id: ObjectId::new(),
        exam_id: exam.id,
        question_sets,
        deprecated: false,
        version: 1,
    })
}

fn is_question_set_config_fulfilled(qsc_with_qs: &QuestionSetConfigWithQuestions) -> bool {
    qsc_with_qs.config.number_of_set as usize == qsc_with_qs.question_sets.len()
        && qsc_with_qs
            .question_sets
            .iter()
            .all(|qs| qs.questions.len() == qsc_with_qs.config.number_of_questions as usize)
}

/// Gets random answers for a question.
fn get_question_with_random_answers(
    question: &ExamEnvironmentMultipleChoiceQuestion,
    question_set_config: &ExamEnvironmentQuestionSetConfig,
) -> Result<ExamEnvironmentMultipleChoiceQuestion, Error> {
    let mut rng = rand::rng();
    let mut random_answers = question.answers.clone();
    random_answers.shuffle(&mut rng);

    let incorrect_answers: Vec<ExamEnvironmentAnswer> = random_answers
        .iter()
        .filter(|a| !a.is_correct)
        .take(question_set_config.number_of_incorrect_answers as usize)
        .cloned()
        .collect();

    let correct_answers: Vec<ExamEnvironmentAnswer> = random_answers
        .iter()
        .filter(|a| a.is_correct)
        .take(question_set_config.number_of_correct_answers as usize)
        .cloned()
        .collect();

    if incorrect_answers.is_empty() || correct_answers.is_empty() {
        return Err(Error::Generation(StatusCode::BAD_REQUEST, format!(
            "Question {} does not have enough correct/incorrect answers.",
            question.id
        )));
    }

    let mut answers = incorrect_answers;
    answers.extend(correct_answers);

    let mut result = question.clone();
    result.answers = answers;
    Ok(result)
}