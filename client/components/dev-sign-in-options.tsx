import {
  Box,
  Button,
  Stack,
  FormControl,
  Input,
  Heading,
  useColorModeValue,
} from "@chakra-ui/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export function DevSignInOptions() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const signinMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      const res = await fetch("/auth/login/dev", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Failed to sign in as dev user");
      }

      return res;
    },
    retry: false,
    onSuccess: () => {
      window.location.reload();
    },
  });

  return (
    <Box w="full" mt={4}>
      <Heading
        as="h3"
        size="md"
        mb={4}
        color={useColorModeValue("teal.400", "teal.300")}
      >
        Dev Sign In
      </Heading>
      <Stack spacing={4}>
        <FormControl>
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            bg={useColorModeValue("gray.700", "gray.700")}
            color="white"
          />
        </FormControl>
        <FormControl>
          <Input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            bg={useColorModeValue("gray.700", "gray.700")}
            color="white"
          />
        </FormControl>
        <Button
          colorScheme="teal"
          onClick={() => signinMutation.mutate({ name, email })}
        >
          Sign In as Dev User
        </Button>
      </Stack>
    </Box>
  );
}
