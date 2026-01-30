import { useContext } from "react";
import { HStack, Text, Avatar } from "@chakra-ui/react";

import { Tooltip } from "./tooltip";
import { UsersWebSocketUsersContext } from "../contexts/users-websocket";

export function UsersOnPage({ page }: { page: string }) {
  const { users, error: usersError } = useContext(UsersWebSocketUsersContext)!;

  const filteredUsers = users.filter((user) => {
    return user.activity.page.pathname === page;
  });

  const bg = "black";
  return (
    <HStack gap={-2} ml={4}>
      {usersError ? (
        <Text color="red.400" fontSize="sm">
          {usersError.message}
        </Text>
      ) : (
        filteredUsers.slice(0, 5).map((user, idx) => (
          <Avatar.Root
            key={user.email}
            size="md"
            border="2px solid"
            borderColor={bg}
            zIndex={5 - idx}
            ml={idx === 0 ? 0 : -3}
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
          size="md"
          bg="gray.700"
          color="gray.200"
          ml={-3}
          zIndex={0}
        >
          <Avatar.Fallback name={`+${filteredUsers.length - 5} more`}>
            +{filteredUsers.length - 5}
          </Avatar.Fallback>
        </Avatar.Root>
      )}
    </HStack>
  );
}
