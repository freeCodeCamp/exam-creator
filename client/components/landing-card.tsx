import { Card, Flex, HStack, Text, Avatar } from "@chakra-ui/react";
import { ReactNode } from "react";
import { User } from "../types";
import { Tooltip } from "./tooltip";

interface LandingCardProps {
  filteredUsers: User[];
  children: ReactNode;
}

export function LandingCard({ filteredUsers, children }: LandingCardProps) {
  return (
    <Card.Root
      borderRadius="xl"
      boxShadow="md"
      px={4}
      py={3}
      h="100%"
      minH="120px"
      _hover={{ borderColor: "border.info", boxShadow: "lg" }}
      borderWidth={2}
      borderColor="transparent"
      transition="all 0.15s"
    >
      <Card.Header pb={2} pt={0} pl={0}>
        <Flex align="center" justify="space-between">
          <Text
            fontSize="xl"
            fontWeight="bold"
            color={"fg.info"}
            lineClamp={1}
            maxW="80%"
          >
            {children}
          </Text>
        </Flex>
      </Card.Header>
      <Card.Body pt={2} pl={0}>
        <HStack gap={-2}>
          {filteredUsers.length === 0 ? (
            <Text color="gray.400" fontSize="sm">
              No one editing
            </Text>
          ) : (
            filteredUsers.slice(0, 5).map((user, idx) => (
              <Avatar.Root
                key={user.name}
                size="sm"
                border="2px solid"
                borderColor={"border.inverted"}
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
          {filteredUsers.length > 5 && (
            <Avatar.Root
              size="sm"
              bg="gray.700"
              color="gray.200"
              ml={-2}
              zIndex={0}
            >
              <Avatar.Fallback name={`+${filteredUsers.length - 5} more`}>
                +{filteredUsers.length - 5}
              </Avatar.Fallback>
            </Avatar.Root>
          )}
        </HStack>
      </Card.Body>
    </Card.Root>
  );
}
