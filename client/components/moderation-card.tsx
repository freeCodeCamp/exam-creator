import {
  Card,
  Text,
  Button,
  Badge,
  Flex,
  VStack,
  Box,
  Spinner,
} from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import { editAttemptRoute } from "../pages/edit-attempt";
import {
  ExamEnvironmentExamModeration,
  ExamEnvironmentExamModerationStatus,
} from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { getAttemptById } from "../utils/fetch";
import { prettyDate } from "../utils/question";
import { Tooltip } from "./tooltip";
import { UsersOnPageAvatars } from "./users-on-page-avatars";

interface ModerationCardProps {
  moderation: ExamEnvironmentExamModeration;
  filter: ExamEnvironmentExamModerationStatus;
}

export function ModerationCard({ moderation, filter }: ModerationCardProps) {
  const navigate = useNavigate();

  const attemptQuery = useQuery({
    queryKey: ["attempt", moderation.examAttemptId],
    queryFn: () => getAttemptById(moderation.examAttemptId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <Button
      variant="plain"
      w="full"
      h="auto"
      p={0}
      onClick={() =>
        navigate({
          to: editAttemptRoute.to,
          params: { id: moderation.examAttemptId },
          search: {
            filter,
          },
        })
      }
      _hover={{ boxShadow: "xl", transform: "translateY(-2px)" }}
      disabled={attemptQuery.isPending || attemptQuery.isError}
      borderRadius="xl"
      transition="all 0.15s"
      display="block"
      textAlign="left"
    >
      <Card.Root
        bg={"bg.subtle"}
        borderRadius="xl"
        boxShadow="md"
        p={4}
        h="100%"
        minH="120px"
        _hover={{ borderColor: "teal.focusRing", boxShadow: "lg" }}
        borderWidth={2}
        borderColor="transparent"
        transition="all 0.15s"
      >
        <Card.Header pb={2}>
          <Flex align="center" justify="space-between">
            {attemptQuery.isPending ? (
              <Spinner color={"teal.focusRing"} />
            ) : (
              <Text
                fontSize="xl"
                fontWeight="bold"
                color={attemptQuery.isError ? "#ff3f3f" : "teal.focusRing"}
                lineClamp={1}
                maxW="80%"
              >
                {attemptQuery.isError
                  ? attemptQuery.error.message
                  : attemptQuery.data.config.name}
              </Text>
            )}
            <Badge
              fontSize={"1em"}
              colorPalette={
                moderation.status === "Pending"
                  ? "blue"
                  : moderation.status === "Approved"
                    ? "green"
                    : "red"
              }
              ml={2}
            >
              {moderation.status}
            </Badge>
          </Flex>
          <Tooltip content={`Moderation ID`} showArrow>
            <Text color="gray.400" fontSize="sm" width={"fit-content"}>
              {moderation.id}
            </Text>
          </Tooltip>
        </Card.Header>
        <Card.Body pt={2}>
          <Flex align="center" justify={"space-between"}>
            <UsersOnPageAvatars
              path={`/attempts/${moderation.examAttemptId}`}
            />
            <Box color="gray.400" fontSize="sm" ml={2}>
              Passing Percent:{" "}
              {attemptQuery.isPending ? (
                <Spinner color={"teal.focusRing"} />
              ) : attemptQuery.isError ? (
                "--"
              ) : (
                attemptQuery.data.config.passingPercent
              )}
            </Box>
          </Flex>
          <VStack align="start" gap={1} mt={4} fontSize="sm" color="gray.300">
            {moderation.feedback && (
              <Text>
                <Box as="span" fontWeight="bold" color="whiteAlpha.600">
                  Feedback:
                </Box>{" "}
                {moderation.feedback}
              </Text>
            )}
            {moderation.moderationDate && (
              <Text>
                <Box as="span" fontWeight="bold" color="whiteAlpha.600">
                  Moderation Date:
                </Box>{" "}
                {prettyDate(moderation.moderationDate)}
              </Text>
            )}
            {moderation.moderatorId && (
              <Text>
                <Box as="span" fontWeight="bold" color="whiteAlpha.600">
                  Moderator ID:
                </Box>{" "}
                {moderation.moderatorId}
              </Text>
            )}
            <Text>
              <Box as="span" fontWeight="bold" color="whiteAlpha.600">
                Submission Date:
              </Box>{" "}
              {prettyDate(moderation.submissionDate)}
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    </Button>
  );
}
