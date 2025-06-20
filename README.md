# Exam Creator

## Using the Application

### Landing Page

From the landing page, you can see the exams saved to the database, and online users and what they are doing.

### Edit Page

#### Tag Config

The tag config consists of multiple tag sets, where a set of tags is required to have at least a specified number of questions.

##### Example

```
Question 1
tags: ["tag a", "tag b"]

Question 2
tags: ["tag a", "tag c"]
```

```
config:
  tags:
    - set: ["tag a"]
        number_of_questions: 2
    - set: ["tag c"]
        number_of_questions: 1
```

The above config would cause both Q1 and Q2 to be added to each generated exam. Q1 and Q2 fulfil the first tag config, and Q2 fulfils the second config.

Notice how the `number_of_questions` fields are not accumulated.

#### Question Type Config

The question type config is where the total number of questions is configured. For _Multiple Choice_ type questions, the `Number of Questions` field should only ever be `1`. In essence, for Multiple Choice\_ question types, read the inputs as:

- Number of Type: How many "Multiple Choice" questions should each exam have?
- Number of Questions: 1... always 1...

So, think of the "Multiple Choice" question type _less_ of a single question, and more of a group of questions whose element count is always one.

For Dialogue question types, it becomes clearer:

- Number of Type: How many "Dialogues" should each exam have?
- Number of Questions: For each "Dialogue", how many Multiple Choice questions should it have?

#### Questions

Available question types:

- Multiple Choice
- Dialogue

A multiple choice question consists of the question itself, optional extra context for the question, and the answers.

A dialogue question consists of context for the dialogue, and _multiple_ multiple choice questions. This is used for when multiple choice questions are linked to the same piece of context.

Questions may be given _tags_ to allow the exam generation the ability to ensure certain topics in the exam are covered.
