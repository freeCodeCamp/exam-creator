import React, { useState } from "react";
import { GiMagnifyingGlass } from "react-icons/gi";
import {
  Input,
  IconButton,
  Box,
  HStack,
  useColorModeValue,
  Fade,
  Badge,
} from "@chakra-ui/react";
import type { EnvExam } from "@prisma/client";

type QuestionSearchProps = {
  exam: EnvExam;
  searchIds: string[];
  setSearchIds: (ids: string[]) => void;
};

export function QuestionSearch({
  exam,
  searchIds,
  setSearchIds,
}: QuestionSearchProps) {
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchToggle = () => {
    setSearchVisible((v) => !v);
    setSearchTerm("");
    setSearchIds([]);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  function findIdsOfNearestMatches(searchTerm: string): string[] {
    const closestIds: string[] = [];
    const searchRegex = new RegExp(searchTerm, "i");
    const questionSets = exam.questionSets;

    outer: for (const questionSet of questionSets) {
      const questionSetText = questionSet.context;
      const questions = questionSet.questions;

      // Check the questionSetText
      const questionSetTextMatch = searchRegex.exec(questionSetText ?? "");
      if (questionSetTextMatch) {
        closestIds.push(questionSet.id);
        continue outer;
      }

      for (const question of questions) {
        const questionText = question.text;
        const answers = question.answers;
        // Check the questionText
        const questionTextMatch = searchRegex.exec(questionText);

        if (questionTextMatch) {
          closestIds.push(question.id);
          continue outer;
        }

        for (const answer of answers) {
          const answerText = answer.text;
          const answerTextMatch = searchRegex.exec(answerText);
          if (answerTextMatch) {
            closestIds.push(question.id);
            continue outer;
          }
        }

        for (const tag of question.tags) {
          const tagMatch = searchRegex.exec(tag);
          if (tagMatch) {
            closestIds.push(question.id);
            continue outer;
          }
        }
      }
    }
    return closestIds;
  }

  const handleSearchKeyPress = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      setSearchIds(findIdsOfNearestMatches(searchTerm));
    }
  };

  const bg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  return (
    <Box position="relative" mb={4}>
      <HStack spacing={2}>
        <IconButton
          aria-label="Search"
          icon={<GiMagnifyingGlass />}
          colorScheme="teal"
          variant={searchVisible ? "solid" : "ghost"}
          onClick={handleSearchToggle}
          size="sm"
        />
        <Fade in={searchVisible}>
          <Box>
            <Input
              size="sm"
              width="220px"
              bg={bg}
              color="gray.100"
              borderColor={accent}
              placeholder="Search Questions..."
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyPress}
              autoFocus
              mr={2}
            />
            <IconButton
              aria-label="Close search"
              icon={<span>&times;</span>}
              size="sm"
              colorScheme="gray"
              variant="ghost"
              ml={2}
              onClick={handleSearchToggle}
            />
            {(searchIds.length > 0 || searchTerm.length !== 0) && (
              <Badge colorScheme="teal" ml={2}>
                {searchIds.length} found
              </Badge>
            )}
          </Box>
        </Fade>
      </HStack>
    </Box>
  );
}
