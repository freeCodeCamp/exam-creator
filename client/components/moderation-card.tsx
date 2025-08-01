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
import { UsersWebSocketContext } from "../contexts/users-websocket";
import { editAttemptRoute } from "../pages/edit-attempt";
import { ExamEnvironmentExamModeration } from "@prisma/client";

interface ModerationCardProps {
  moderation: ExamEnvironmentExamModeration;
}

export function ModerationCard({ moderation }: ModerationCardProps) {
  const { users, error: usersError } = useContext(UsersWebSocketContext)!;
  const navigate = useNavigate();
  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  // Find users currently editing/viewing this attempt
  const editingUsers = users.filter((u) => {
    const usersPath = u.activity.page.pathname;
    return usersPath === `/moderation/${moderation.id}`;
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
              {moderation.id}
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
        </CardHeader>
        <CardBody pt={2}>
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
                    src={user.picture}
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
                {new Date(moderation.moderationDate).toLocaleString()}
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
