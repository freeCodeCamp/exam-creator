import { Box, Text } from "@chakra-ui/react";

interface TitleStateProps {
  title: string;
  stat: string | number;
}

export function TitleStat({ title, stat }: TitleStateProps) {
  return (
    <Box
      bg="bg"
      borderWidth={1}
      borderColor="bg.emphasized"
      borderRadius="md"
      p={3}
      cursor="help"
    >
      <Text color="fg.info" fontSize="xs" fontWeight="bold">
        {title}
      </Text>
      <Text color="fg.success" fontSize="lg" fontWeight="bold">
        {stat}
      </Text>
    </Box>
  );
}
