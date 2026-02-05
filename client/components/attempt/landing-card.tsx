import {
  Card,
  Flex,
  Text,
  Badge,
  Spinner,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";

import { getModerationsCount } from "../../utils/fetch";
import { Tooltip } from "../tooltip";
import { UsersOnPageAvatars } from "../users-on-page-avatars";

interface AttemptsLandingCardProps {
  path: string;
}

export function AttemptsLandingCard({ path }: AttemptsLandingCardProps) {
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
        <UsersOnPageAvatars path={path} />
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
