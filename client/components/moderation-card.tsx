import {
  Card,
  HStack,
  Avatar,
  Text,
  Button,
  Badge,
  Flex,
  VStack,
  Box,
  Spinner,
} from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import { useContext } from "react";
import { UsersWebSocketUsersContext } from "../contexts/users-websocket";
import { editAttemptRoute } from "../pages/edit-attempt";
import {
  ExamEnvironmentExamModeration,
  ExamEnvironmentExamModerationStatus,
} from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { getAttemptById } from "../utils/fetch";
import { prettyDate } from "../utils/question";
import { Tooltip } from "./tooltip";

interface ModerationCardProps {
  moderation: ExamEnvironmentExamModeration;
  filter: ExamEnvironmentExamModerationStatus;
}

export function ModerationCard({ moderation, filter }: ModerationCardProps) {
  const { users, error: usersError } = useContext(UsersWebSocketUsersContext)!;
  const navigate = useNavigate();
  const cardBg = "gray.800";
  const accent = "teal.300";

  // Find users currently editing/viewing this attempt
  const editingUsers = users.filter((u) => {
    const usersPath = u.activity.page.pathname;
    return usersPath === `/attempts/${moderation.examAttemptId}`;
  });

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
        bg={cardBg}
        borderRadius="xl"
        boxShadow="md"
        p={4}
        h="100%"
        minH="120px"
        _hover={{ borderColor: accent, boxShadow: "lg" }}
        borderWidth={2}
        borderColor="transparent"
        transition="all 0.15s"
      >
        <Card.Header pb={2}>
          <Flex align="center" justify="space-between">
            {attemptQuery.isPending ? (
              <Spinner color={accent} />
            ) : (
              <Text
                fontSize="xl"
                fontWeight="bold"
                color={attemptQuery.isError ? "#ff3f3f" : accent}
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
            <HStack gap={-2}>
              {usersError ? (
                <Text color="red.300">{usersError.message}</Text>
              ) : editingUsers.length === 0 ? (
                <Text color="gray.400" fontSize="sm">
                  No one editing
                </Text>
              ) : (
                editingUsers.slice(0, 5).map((user, idx) => (
                  <Avatar.Root
                    key={user.name}
                    size="sm"
                    border="2px solid"
                    borderColor={cardBg}
                    zIndex={5 - idx}
                    ml={idx === 0 ? 0 : -2}
                    boxShadow="md"
                  >
                    <Avatar.Image src={user.picture ?? undefined} />
                    <Tooltip content={user.name}>
                      <Avatar.Fallback name={user.name} />
                    </Tooltip>
                  </Avatar.Root>
                ))
              )}
              {editingUsers.length > 5 && (
                <Avatar.Root
                  size="sm"
                  bg="gray.700"
                  color="gray.200"
                  ml={-2}
                  zIndex={0}
                >
                  <Avatar.Fallback name={`+${editingUsers.length - 5} more`}>
                    +{editingUsers.length - 5}
                  </Avatar.Fallback>
                </Avatar.Root>
              )}
            </HStack>
            <Box color="gray.400" fontSize="sm" ml={2}>
              Passing Percent:{" "}
              {attemptQuery.isPending ? (
                <Spinner color={accent} />
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
