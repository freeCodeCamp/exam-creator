import { HStack, Avatar, Text } from "@chakra-ui/react";
import { useUsersOnPath } from "../hooks/use-users-on-path";
import { Tooltip } from "./tooltip";

interface UsersOnPageAvatarsProps {
  path: string;
}

export function UsersOnPageAvatars({ path }: UsersOnPageAvatarsProps) {
  const { users: usersOnPage, error: usersError } = useUsersOnPath(path);
  const bg = "black";

  return (
    <HStack gap={-2} ml={4}>
      {usersError ? (
        <Text color="fg.error" fontSize="sm">
          {usersError.message}
        </Text>
      ) : (
        usersOnPage.slice(0, 5).map((user, idx) => (
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
      {usersOnPage.length > 5 && (
        <Avatar.Root
          size="md"
          bg="gray.700"
          color="gray.200"
          ml={-3}
          zIndex={0}
        >
          <Avatar.Fallback name={`+${usersOnPage.length - 5} more`}>
            +{usersOnPage.length - 5}
          </Avatar.Fallback>
        </Avatar.Root>
      )}
    </HStack>
  );
}
