import { useContext, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Text,
  Badge,
  Menu,
  Portal,
  Spinner,
} from "@chakra-ui/react";
import { useMutation } from "@tanstack/react-query";
import { ChevronDownIcon, Database } from "lucide-react";
import { putUserSettings } from "../utils/fetch";
import { AuthContext } from "../contexts/auth";
import { Tooltip } from "./tooltip";
import { toaster } from "./toaster";

export function DatabaseStatus() {
  const { user } = useContext(AuthContext)!;
  const [databaseEnvironment, setDatabaseEnvironment] = useState(
    user?.settings?.databaseEnvironment || "Production",
  );

  const { isError, isPending, error, mutate } = useMutation({
    mutationKey: ["userSettingsDatabase"],
    mutationFn: async (databaseEnvironment: "Production" | "Staging") => {
      return putUserSettings({ databaseEnvironment });
    },
    onSuccess: (data) => {
      setDatabaseEnvironment(data.databaseEnvironment);
      // TODO: This does not work.
      // navigate({ to: "." });
      toaster.create({
        title: "Database switched",
        description: `Switched to ${data.databaseEnvironment} database`,
        type: "success",
        duration: 3000,
        closable: true,
      });
      window.location.reload();
    },
    onError: (error: any) => {
      console.error(error);
      toaster.create({
        title: "Error switching database",
        description: error.message || "An error occurred",
        type: "error",
        duration: 5000,
        closable: true,
      });
    },
    retry: false,
  });

  function getBadgeColor(env: "Production" | "Staging") {
    return env === "Production" ? "red" : "yellow";
  }

  if (isError) {
    console.error(error);
    return (
      <Box>
        <Badge colorPalette="red">Error fetching</Badge>
      </Box>
    );
  }

  return (
    <HStack gap={2}>
      <Tooltip content="Change the database environment to filter which attempts to moderate">
        <HStack gap={2}>
          <Database size={16} />
          <Text fontSize="sm" fontWeight="medium">
            Database:
          </Text>
        </HStack>
      </Tooltip>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button size="sm" variant="outline" disabled={isPending}>
            <Badge
              colorPalette={getBadgeColor(databaseEnvironment)}
              variant="solid"
            >
              {databaseEnvironment}
            </Badge>
            {isPending ? <Spinner size="xs" /> : <ChevronDownIcon size={16} />}
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content>
              <Menu.Item
                onClick={() => mutate("Production")}
                value={"production"}
                disabled={databaseEnvironment === "Production" || isPending}
              >
                <Badge colorPalette="red" variant="solid" mr={2}>
                  Production
                </Badge>
                Live data
              </Menu.Item>
              <Menu.Item
                onClick={() => mutate("Staging")}
                value={"staging"}
                disabled={databaseEnvironment === "Staging" || isPending}
              >
                <Badge colorPalette="yellow" variant="solid" mr={2}>
                  Staging
                </Badge>
                Test data
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </HStack>
  );
}
