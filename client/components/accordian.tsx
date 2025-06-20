import React from "react";
import { parseMarkdown } from "../utils/question";
import {
  Box,
  Collapse,
  useDisclosure,
  Card,
  CardHeader,
  CardBody,
  Heading,
  IconButton,
  Flex,
} from "@chakra-ui/react";
import { ChevronDown, ChevronUp } from "lucide-react";

type AccordionProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function QuestionAccordion({
  title,
  subtitle,
  children,
}: AccordionProps) {
  const { isOpen, onToggle } = useDisclosure();

  return (
    <Card
      bg="gray.800"
      borderRadius="xl"
      boxShadow="md"
      mb={4}
      borderWidth={1}
      borderColor="gray.700"
    >
      <CardHeader
        px={4}
        py={3}
        cursor="pointer"
        onClick={onToggle}
        _hover={{ bg: "gray.700" }}
      >
        <Flex align="center" justify="space-between">
          <Box>
            <Heading size="md" color="teal.300">
              {title}
            </Heading>
            <Box
              color="gray.300"
              fontSize="sm"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(subtitle) }}
            />
          </Box>
          <IconButton
            aria-label={isOpen ? "Collapse" : "Expand"}
            icon={isOpen ? <ChevronUp /> : <ChevronDown />}
            variant="ghost"
            colorScheme="teal"
            size="sm"
            onClick={onToggle}
            ml={2}
          />
        </Flex>
      </CardHeader>
      <Collapse in={isOpen}>
        <CardBody pt={0}>{children}</CardBody>
      </Collapse>
    </Card>
  );
}
