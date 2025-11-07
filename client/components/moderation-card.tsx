import {
  Card,
  CardBody,
  CardHeader,
  HStack,
  Avatar,
  Tooltip,
  Text,
  useColorModeValue,
  Button,
  Badge,
  Flex,
  VStack,
  Box,
} from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import { useContext } from "react";
import { UsersWebSocketUsersContext } from "../contexts/users-websocket";
import { editAttemptRoute } from "../pages/edit-attempt";
import {
  ExamEnvironmentConfig,
  ExamEnvironmentExamModeration,
} from "@prisma/client";

interface ModerationCardProps {
  moderation: ExamEnvironmentExamModeration & { config: ExamEnvironmentConfig };
}

export function ModerationCard({ moderation }: ModerationCardProps) {
  const { users, error: usersError } = useContext(UsersWebSocketUsersContext)!;
  const navigate = useNavigate();
  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  // Find users currently editing/viewing this attempt
  const editingUsers = users.filter((u) => {
    const usersPath = u.activity.page.pathname;
    return usersPath === `/attempts/${moderation.examAttemptId}`;
  });

  return (
    <Button
      variant="unstyled"
      w="full"
      h="auto"
      p={0}
      onClick={() =>
        navigate({
          to: editAttemptRoute.to,
          params: { id: moderation.examAttemptId },
        })
      }
      _hover={{ boxShadow: "xl", transform: "translateY(-2px)" }}
      borderRadius="xl"
      transition="all 0.15s"
      display="block"
      textAlign="left"
    >
      <Card
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
        <CardHeader pb={2}>
          <Flex align="center" justify="space-between">
            <Text
              fontSize="xl"
              fontWeight="bold"
              color={accent}
              noOfLines={1}
              maxW="80%"
            >
              {moderation.config.name}
            </Text>
            <Badge
              fontSize={"1em"}
              colorScheme={
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
          <Tooltip label={`Moderation ID`} hasArrow>
            <Text color="gray.400" fontSize="sm" width={"fit-content"}>
              {moderation.id}
            </Text>
          </Tooltip>
        </CardHeader>
        <CardBody pt={2}>
          <Flex align="center" justify={"space-between"}>
            <HStack spacing={-2}>
              {usersError ? (
                <Text color="red.300">{usersError.message}</Text>
              ) : editingUsers.length === 0 ? (
                <Text color="gray.400" fontSize="sm">
                  No one editing
                </Text>
              ) : (
                editingUsers.slice(0, 5).map((user, idx) => (
                  <Tooltip label={user.name} key={user.name}>
                    <Avatar
                      src={user.picture ?? undefined}
                      name={user.name}
                      size="sm"
                      border="2px solid"
                      borderColor={cardBg}
                      zIndex={5 - idx}
                      ml={idx === 0 ? 0 : -2}
                      boxShadow="md"
                    />
                  </Tooltip>
                ))
              )}
              {editingUsers.length > 5 && (
                <Avatar
                  size="sm"
                  bg="gray.700"
                  color="gray.200"
                  ml={-2}
                  zIndex={0}
                  name={`+${editingUsers.length - 5} more`}
                >
                  +{editingUsers.length - 5}
                </Avatar>
              )}
            </HStack>
            <Text color="gray.400" fontSize="sm" ml={2}>
              Passing Percent: {moderation.config.passingPercent}
            </Text>
          </Flex>
          <VStack
            align="start"
            spacing={1}
            mt={4}
            fontSize="sm"
            color="gray.300"
          >
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
                {new Date(moderation.moderationDate).toString()}
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
              {new Date(moderation.submissionDate).toString()}
            </Text>
          </VStack>
        </CardBody>
      </Card>
    </Button>
  );
}
