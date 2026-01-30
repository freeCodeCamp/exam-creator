import {
  Card,
  HStack,
  Avatar,
  Badge,
  Text,
  Button,
  Flex,
  Checkbox,
  CheckboxCheckedChangeDetails,
} from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import { editExamRoute } from "../pages/edit-exam";
import type { ExamCreatorExam } from "@prisma/client";
import { useContext } from "react";
import { UsersWebSocketUsersContext } from "../contexts/users-websocket";
import { Tooltip } from "./tooltip";

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
  const { users, error: usersError } = useContext(UsersWebSocketUsersContext)!;
  const navigate = useNavigate();

  // Find users currently editing/viewing this exam
  const editingUsers = users.filter((u) => {
    const usersPath = u.activity.page.pathname;
    return usersPath === `/exams/${exam.id}`;
  });

  const handleClick = () => {
    if (selectionMode && onSelectionChange) {
      onSelectionChange(exam.id, !isSelected);
    } else {
      navigate({ to: editExamRoute.to, params: { id: exam.id } });
    }
  };

  const handleCheckboxChange = (d: CheckboxCheckedChangeDetails) => {
    onSelectionChange?.(exam.id, !!d.checked);
  };

  return (
    <Button
      variant="plain"
      w="full"
      h="auto"
      p={0}
      onClick={handleClick}
      _hover={{ boxShadow: "xl", transform: "translateY(-2px)" }}
      borderRadius="xl"
      transition="all 0.15s"
      display="block"
      textAlign="left"
      bg="bg.panel"
    >
      <Card.Root
        borderRadius="xl"
        boxShadow="md"
        p={3}
        h="100%"
        minH="120px"
        _hover={{ borderColor: "fg.info", boxShadow: "lg" }}
        borderWidth={2}
        borderColor={isSelected ? "fg.info" : "transparent"}
        transition="all 0.15s"
      >
        <Card.Header pb={2} padding={1}>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={3} flex="1 1 0%" minW={0}>
              {selectionMode && (
                <Checkbox.Root
                  checked={isSelected}
                  onCheckedChange={handleCheckboxChange}
                  colorPalette="teal"
                  size="lg"
                >
                  <Checkbox.Control />
                </Checkbox.Root>
              )}
              <Text
                fontSize="xl"
                fontWeight="bold"
                color={"fg.info"}
                lineClamp={1}
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
                colorPalette="red"
                ml={2}
                flexShrink={0}
                minW="90px"
                textAlign="center"
              >
                Deprecated
              </Badge>
            )}
          </Flex>
        </Card.Header>
        <Card.Body pt={2} padding={1}>
          <HStack gap={-2}>
            {usersError ? (
              <Text>{usersError.message}</Text>
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
                  borderColor={"border.emphasized"}
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
        </Card.Body>
        <Card.Footer padding="0" justifyContent={"space-evenly"}>
          {databaseEnvironments.map((env) => (
            <Tooltip
              content={`This exam is seeded in the ${env} database`}
              key={env}
            >
              <Badge
                key={env}
                colorPalette={env === "Production" ? "green" : "blue"}
                minW="90px"
                justifyContent={"center"}
              >
                {env}
              </Badge>
            </Tooltip>
          ))}
        </Card.Footer>
      </Card.Root>
    </Button>
  );
}
