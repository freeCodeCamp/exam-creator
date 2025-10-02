import { useContext, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Text,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Spinner,
  Tooltip,
} from "@chakra-ui/react";
import { useMutation } from "@tanstack/react-query";
import { ChevronDownIcon, Database } from "lucide-react";
import { putUserSettings } from "../utils/fetch";
import { AuthContext } from "../contexts/auth";

export function DatabaseStatus() {
  const toast = useToast();
  const { user } = useContext(AuthContext)!;
  const [databaseEnvironment, setDatabaseEnvironment] = useState(
    user?.settings?.databaseEnvironment || "Production"
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
      toast({
        title: "Database switched",
        description: `Switched to ${data.databaseEnvironment} database`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
      window.location.reload();
    },
    onError: (error: any) => {
      console.error(error);
      toast({
        title: "Error switching database",
        description: error.message || "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
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
        <Badge colorScheme="red">Error fetching</Badge>
      </Box>
    );
  }

  return (
    <HStack spacing={2}>
      <Tooltip label="Change the database environment to filter which attempts to moderate">
        <HStack spacing={2}>
          <Database size={16} />
          <Text fontSize="sm" fontWeight="medium">
            Database:
          </Text>
        </HStack>
      </Tooltip>
      <Menu>
        <MenuButton
          as={Button}
          rightIcon={
            isPending ? <Spinner size="xs" /> : <ChevronDownIcon size={16} />
          }
          size="sm"
          variant="outline"
          isDisabled={isPending}
        >
          <Badge
            colorScheme={getBadgeColor(databaseEnvironment)}
            variant="solid"
          >
            {databaseEnvironment}
          </Badge>
        </MenuButton>
        <MenuList>
          <MenuItem
            onClick={() => mutate("Production")}
            isDisabled={databaseEnvironment === "Production" || isPending}
          >
            <Badge colorScheme="red" variant="solid" mr={2}>
              Production
            </Badge>
            Live data
          </MenuItem>
          <MenuItem
            onClick={() => mutate("Staging")}
            isDisabled={databaseEnvironment === "Staging" || isPending}
          >
            <Badge colorScheme="yellow" variant="solid" mr={2}>
              Staging
            </Badge>
            Test data
          </MenuItem>
        </MenuList>
      </Menu>
    </HStack>
  );
}
