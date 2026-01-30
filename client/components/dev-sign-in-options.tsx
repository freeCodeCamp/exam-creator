import { Box, Button, Stack, Field, Input, Heading } from "@chakra-ui/react";
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
      <Heading as="h3" size="md" mb={4} color={"teal.300"}>
        Dev Sign In
      </Heading>
      <Stack gap={4}>
        <Field.Root>
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            bg={"gray.700"}
            color="white"
          />
        </Field.Root>
        <Field.Root>
          <Input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            bg={"gray.700"}
            color="white"
          />
        </Field.Root>
        <Button
          colorPalette="teal"
          onClick={() => signinMutation.mutate({ name, email })}
        >
          Sign In as Dev User
        </Button>
      </Stack>
    </Box>
  );
}
