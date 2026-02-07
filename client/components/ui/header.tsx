import { Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { ReactNode } from "react";
import { UsersOnPageAvatars } from "../users-on-page-avatars";

interface HeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function Header({ title, description, children }: HeaderProps) {
  const path = window.location.pathname.split("/")[1];
  console.debug(path);
  return (
    <Flex
      justify="space-between"
      align="center"
      bg={"bg"}
      borderRadius="xl"
      p={8}
      boxShadow="lg"
      mb={2}
    >
      <Stack gap={1}>
        <Heading color={"fg.info"} fontWeight="extrabold" fontSize="3xl">
          {title}
        </Heading>
        {description && (
          <Text color="fg.muted" fontSize="lg">
            Create exams for the Exam Environment.
          </Text>
        )}
      </Stack>
      <UsersOnPageAvatars path={"/" + path} />
      {children}
    </Flex>
  );
}
