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
  CardFooter,
  Badge,
  Spinner,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import { User } from "../../types";
import { useQuery } from "@tanstack/react-query";
import { getModerationsCount } from "../../utils/fetch";

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

  const cardBg = useColorModeValue("gray.800", "gray.800");
  const accent = useColorModeValue("teal.400", "teal.300");
  return (
    <Card
      bg={cardBg}
      borderRadius="xl"
      boxShadow="md"
      px={4}
      py={3}
      h="100%"
      minH="120px"
      _hover={{ borderColor: accent, boxShadow: "lg" }}
      borderWidth={2}
      borderColor="transparent"
      transition="all 0.15s"
    >
      <CardHeader pb={2} pt={0} pl={0}>
        <Flex align="center" justify="space-between">
          <Text
            fontSize="xl"
            fontWeight="bold"
            color={accent}
            noOfLines={1}
            maxW="80%"
          >
            Attempts
          </Text>
        </Flex>
      </CardHeader>
      <CardBody pt={2} pl={0}>
        <HStack spacing={-2}>
          {filteredUsers.length === 0 ? (
            <Text color="gray.400" fontSize="sm">
              No one editing
            </Text>
          ) : (
            filteredUsers.slice(0, 5).map((user, idx) => (
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
      <CardFooter padding="0" flexDirection="column" pl={0}>
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
      </CardFooter>
    </Card>
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
            label={`${staging[statusKey]} ${statusKey} attempt${
              staging[statusKey] !== 1 ? "s" : ""
            }`}
          >
            <Badge
              colorScheme={
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
              {statusKey}: {staging[statusKey]}
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
            label={`${production[statusKey]} ${statusKey} attempt${
              production[statusKey] !== 1 ? "s" : ""
            }`}
          >
            <Badge
              colorScheme={
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
              {statusKey}: {production[statusKey]}
            </Badge>
          </Tooltip>
        </GridItem>
      ))}
    </Grid>
  );
}
