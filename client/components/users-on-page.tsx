import { useContext } from "react";
import {
  HStack,
  Text,
  Avatar,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";

import { UsersWebSocketUsersContext } from "../contexts/users-websocket";

export function UsersOnPage({ page }: { page: string }) {
  const { users, error: usersError } = useContext(UsersWebSocketUsersContext)!;

  const filteredUsers = users.filter((user) => {
    return user.activity.page.pathname === page;
  });

  const bg = useColorModeValue("black", "black");
  return (
    <HStack spacing={-2} ml={4}>
      {usersError ? (
        <Text color="red.400" fontSize="sm">
          {usersError.message}
        </Text>
      ) : (
        filteredUsers.slice(0, 5).map((user, idx) => (
          <Tooltip label={user.name} key={user.email}>
            <Avatar
              src={user.picture ?? undefined}
              name={user.name}
              size="md"
              border="2px solid"
              borderColor={bg}
              zIndex={5 - idx}
              ml={idx === 0 ? 0 : -3}
              boxShadow="md"
            />
          </Tooltip>
        ))
      )}
      {filteredUsers.length > 5 && (
        <Avatar
          size="md"
          bg="gray.700"
          color="gray.200"
          ml={-3}
          zIndex={0}
          name={`+${filteredUsers.length - 5} more`}
        >
          +{filteredUsers.length - 5}
        </Avatar>
      )}
    </HStack>
  );
}
