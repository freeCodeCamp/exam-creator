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
  Checkbox,
  CardFooter,
} from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import { editExamRoute } from "../pages/edit-exam";
import type { ExamCreatorExam } from "@prisma/client";
import { useContext } from "react";
import { UsersWebSocketContext } from "../contexts/users-websocket";

interface ExamCardProps {
  exam: Omit<ExamCreatorExam, "questionSets">;
  isSelected?: boolean;
  onSelectionChange?: (examId: string, selected: boolean) => void;
  selectionMode?: boolean;
  databaseEnvironments: ("Staging" | "Production")[];
}

export function ExamCard({
  exam,
  isSelected = false,
  onSelectionChange,
  selectionMode = false,
  databaseEnvironments,
}: ExamCardProps) {
  const { users, error: usersError } = useContext(UsersWebSocketContext)!;
  const navigate = useNavigate();
  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");

  // Find users currently editing/viewing this exam
  const editingUsers = users.filter((u) => {
    const usersPath = u.activity.page.pathname;
    return usersPath === `/exam/${exam.id}`;
  });

  const handleClick = () => {
    if (selectionMode && onSelectionChange) {
      onSelectionChange(exam.id, !isSelected);
    } else {
      navigate({ to: editExamRoute.to, params: { id: exam.id } });
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelectionChange?.(exam.id, e.target.checked);
  };

  return (
    <Button
      variant="unstyled"
      w="full"
      h="auto"
      p={0}
      onClick={handleClick}
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
        p={3}
        h="100%"
        minH="120px"
        _hover={{ borderColor: accent, boxShadow: "lg" }}
        borderWidth={2}
        borderColor={isSelected ? accent : "transparent"}
        transition="all 0.15s"
      >
        <CardHeader pb={2} padding={1}>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={3} flex="1 1 0%" minW={0}>
              {selectionMode && (
                <Checkbox
                  isChecked={isSelected}
                  onChange={handleCheckboxChange}
                  colorScheme="teal"
                  size="lg"
                />
              )}
              <Text
                fontSize="xl"
                fontWeight="bold"
                color={accent}
                noOfLines={1}
                flex={1}
                minW={0}
                textOverflow="ellipsis"
                overflow="hidden"
                whiteSpace="nowrap"
              >
                {exam.config.name}
              </Text>
            </Flex>
            {exam.deprecated && (
              <Badge
                colorScheme="red"
                ml={2}
                flexShrink={0}
                minW="90px"
                textAlign="center"
              >
                Deprecated
              </Badge>
            )}
          </Flex>
        </CardHeader>
        <CardBody pt={2} padding={1}>
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
        </CardBody>
        <CardFooter padding="0" justifyContent={"space-evenly"}>
          {databaseEnvironments.map((env) => (
            <Tooltip
              label={`This exam is seeded in the ${env} database`}
              key={env}
            >
              <Badge
                key={env}
                colorScheme={env === "Production" ? "green" : "blue"}
                flexShrink={0}
                minW="90px"
                textAlign="center"
              >
                {env}
              </Badge>
            </Tooltip>
          ))}
        </CardFooter>
      </Card>
    </Button>
  );
}
