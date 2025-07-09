import {
  useColorModeValue,
  Card,
  CardHeader,
  Flex,
  CardBody,
  HStack,
  Tooltip,
  Text,
  Avatar,
} from "@chakra-ui/react";
import { ReactNode } from "react";
import { User } from "../types";

interface LandingCardProps {
  filteredUsers: User[];
  children: ReactNode;
}

export function LandingCard({ filteredUsers, children }: LandingCardProps) {
  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");
  return (
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
            {children}
          </Text>
        </Flex>
      </CardHeader>
      <CardBody pt={2}>
        <HStack spacing={-2}>
          {filteredUsers.length === 0 ? (
            <Text color="gray.400" fontSize="sm">
              No one editing
            </Text>
          ) : (
            filteredUsers.slice(0, 5).map((user, idx) => (
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
          {filteredUsers.length > 5 && (
            <Avatar
              size="sm"
              bg="gray.700"
              color="gray.200"
              ml={-2}
              zIndex={0}
              name={`+${filteredUsers.length - 5} more`}
            >
              +{filteredUsers.length - 5}
            </Avatar>
          )}
        </HStack>
      </CardBody>
    </Card>
  );
}
