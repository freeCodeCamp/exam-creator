import {
  Card,
  Flex,
  HStack,
  Text,
  Avatar,
  Badge,
  Spinner,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";

import { User } from "../../types";
import { getModerationsCount } from "../../utils/fetch";
import { Tooltip } from "../tooltip";

interface AttemptsLandingCardProps {
  filteredUsers: User[];
}

export function AttemptsLandingCard({
  filteredUsers,
}: AttemptsLandingCardProps) {
  const moderationsCountQuery = useQuery({
    queryKey: ["moderationsCount"],
    queryFn: getModerationsCount,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <Card.Root
      borderRadius="xl"
      boxShadow="md"
      px={4}
      py={3}
      h="100%"
      minH="120px"
      _hover={{ borderColor: "teal.300", boxShadow: "lg" }}
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
            Attempts
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
                border="2px solid"
                borderColor={"border.inverted"}
                zIndex={5 - idx}
                ml={idx === 0 ? 0 : -2}
                boxShadow="md"
                size="sm"
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
              bg="gray.700"
              color="gray.200"
              ml={-2}
              zIndex={0}
              size="sm"
            >
              <Avatar.Image>+{filteredUsers.length - 5}</Avatar.Image>
              <Avatar.Fallback name={`+${filteredUsers.length - 5} more`} />
            </Avatar.Root>
          )}
        </HStack>
      </Card.Body>
      <Card.Footer padding="0" flexDirection="column" pl={0}>
        {moderationsCountQuery.isError ? (
          <Text color="red.400" fontSize="sm">
            {moderationsCountQuery.error.message}
          </Text>
        ) : moderationsCountQuery.isPending ? (
          <Spinner size="sm" />
        ) : null}

        {moderationsCountQuery.isSuccess && (
          <ModerationSummary moderationsCount={moderationsCountQuery.data} />
        )}
      </Card.Footer>
    </Card.Root>
  );
}

interface ModerationSummaryProps {
  moderationsCount: Awaited<ReturnType<typeof getModerationsCount>>;
}

function ModerationSummary({ moderationsCount }: ModerationSummaryProps) {
  const statusOrder = ["approved", "denied", "pending"] as const;
  const { staging, production } = moderationsCount;

  return (
    <Grid
      templateColumns="1fr repeat(3, 2fr)"
      rowGap={2}
      columnGap={2}
      alignItems={"center"}
    >
      <GridItem>
        <Text fontSize="xs" fontWeight="semibold" color="gray.400">
          Staging:
        </Text>
      </GridItem>
      {statusOrder.map((statusKey) => (
        <GridItem key={`staging-${statusKey}`}>
          <Tooltip
            content={`${staging[statusKey]} ${statusKey} attempt${
              staging[statusKey] !== 1 ? "s" : ""
            }`}
          >
            <Badge
              colorPalette={
                statusKey === "approved"
                  ? "green"
                  : statusKey === "denied"
                    ? "red"
                    : "yellow"
              }
              fontSize="xs"
              px={2}
              py={1}
              display="inline-block"
              width="100%"
              textAlign="center"
            >
              {staging[statusKey]}
            </Badge>
          </Tooltip>
        </GridItem>
      ))}
      <GridItem>
        <Text fontSize="xs" fontWeight="semibold" color="gray.400">
          Production:
        </Text>
      </GridItem>
      {statusOrder.map((statusKey) => (
        <GridItem key={`production-${statusKey}`}>
          <Tooltip
            content={`${production[statusKey]} ${statusKey} attempt${
              production[statusKey] !== 1 ? "s" : ""
            }`}
          >
            <Badge
              colorPalette={
                statusKey === "approved"
                  ? "green"
                  : statusKey === "denied"
                    ? "red"
                    : "yellow"
              }
              fontSize="xs"
              px={2}
              py={1}
              display="inline-block"
              width="100%"
              textAlign="center"
            >
              {production[statusKey]}
            </Badge>
          </Tooltip>
        </GridItem>
      ))}
    </Grid>
  );
}
