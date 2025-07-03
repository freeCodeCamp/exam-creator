import {
  Card,
  CardBody,
  CardHeader,
  HStack,
  Avatar,
  Tooltip,
  Badge,
  Text,
  useColorModeValue,
  Button,
  Flex,
} from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import { editRoute } from "../pages/edit";
import type { EnvExam } from "@prisma/client";
import { useContext } from "react";
import { UsersWebSocketContext } from "../contexts/users-websocket";

interface ExamCardProps {
  exam: Omit<EnvExam, "questionSets">;
}

export function ExamCard({ exam }: ExamCardProps) {
  const { users, error: usersError } = useContext(UsersWebSocketContext)!;
  const navigate = useNavigate();
  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  // Find users currently editing/viewing this exam
  const editingUsers = users.filter((u) => u.activity?.exam === exam.id) ?? [];

  return (
    <Button
      variant="unstyled"
      w="full"
      h="auto"
      p={0}
      onClick={() => navigate({ to: editRoute.to, params: { id: exam.id } })}
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
              {exam.config.name}
            </Text>
            {exam.deprecated && (
              <Badge colorScheme="red" ml={2}>
                Deprecated
              </Badge>
            )}
          </Flex>
        </CardHeader>
        <CardBody pt={2}>
          <HStack spacing={-2}>
            {usersError ? (
              <Text>{usersError.message}</Text>
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
        </CardBody>
      </Card>
    </Button>
  );
}
