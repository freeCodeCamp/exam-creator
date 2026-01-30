import React from "react";
import { parseMarkdown } from "../utils/question";
import {
  Box,
  Collapsible,
  useDisclosure,
  Card,
  Heading,
  IconButton,
  Flex,
  Badge,
  HStack,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { ChevronDown, ChevronUp } from "lucide-react";

type AccordionProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  borderColor?: string;
  borderStyle?: string;
  borderWidth?: string;
  generationCount?: number;
  isLoading?: boolean;
  dualBorder?: boolean;
  stagingCount?: number;
  productionCount?: number;
};

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export function QuestionAccordion({
  title,
  subtitle,
  children,
  borderColor = "bg.muted",
  borderStyle = "solid",
  borderWidth = "1px",
  generationCount,
  isLoading = false,
  dualBorder = false,
  stagingCount,
  productionCount,
}: AccordionProps) {
  const { open, onToggle } = useDisclosure();

  return (
    <Box position="relative" marginTop={1}>
      {isLoading && (
        <Box
          position="absolute"
          top="-2px"
          left="-2px"
          right="-2px"
          bottom="-2px"
          borderRadius="xl"
          background={`repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            ${borderColor} 10px,
            ${borderColor} 20px
          )`}
          animation={`${rotate} 3s linear infinite`}
          pointerEvents="none"
          zIndex={0}
        />
      )}
      <Card.Root
        borderRadius="xl"
        boxShadow="md"
        borderWidth={isLoading ? "0" : borderWidth}
        borderColor={borderColor}
        borderStyle={borderStyle}
        position="relative"
        zIndex={1}
        css={
          dualBorder
            ? {
                boxShadow: `0 0 0 3px #ECC94B, 0 0 0 6px #48BB78`,
                borderWidth: "0",
              }
            : undefined
        }
      >
        {dualBorder &&
        stagingCount !== undefined &&
        productionCount !== undefined ? (
          <HStack
            position="absolute"
            top="-10px"
            left="50%"
            transform="translateX(-50%)"
            gap={1}
            zIndex={1}
          >
            <Badge
              colorPalette="yellow"
              fontSize="xs"
              px={2}
              borderRadius="md"
              bg="yellow.500"
              color="white"
            >
              S: {stagingCount}
            </Badge>
            <Badge
              colorPalette="green"
              fontSize="xs"
              px={2}
              borderRadius="md"
              bg="green.500"
              color="white"
            >
              P: {productionCount}
            </Badge>
          </HStack>
        ) : generationCount !== undefined && generationCount > 0 ? (
          <Badge
            position="absolute"
            top="-10px"
            left="50%"
            transform="translateX(-50%)"
            colorPalette={
              borderColor === "green.400"
                ? "green"
                : borderColor === "yellow.400"
                  ? "yellow"
                  : "red"
            }
            fontSize="xs"
            px={2}
            borderRadius="md"
            zIndex={1}
            bg={
              borderColor === "green.400"
                ? "green.500"
                : borderColor === "yellow.400"
                  ? "yellow.500"
                  : "red.500"
            }
            color="white"
          >
            {generationCount} {generationCount === 1 ? "exam" : "exams"}
          </Badge>
        ) : null}
        <Card.Header
          px={4}
          py={3}
          cursor="pointer"
          onClick={onToggle}
          _hover={{ bg: "gray.700" }}
        >
          <Flex align="center" justify="space-between">
            <Box maxW="100%" overflowX="auto">
              <Heading color="teal.400" size="md" maxW="100%">
                {title}
              </Heading>
              <Box
                fontSize="sm"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(subtitle) }}
                whiteSpace="pre-line"
              />
            </Box>
            <IconButton
              aria-label={open ? "Collapse" : "Expand"}
              variant="ghost"
              colorPalette="teal"
              size="sm"
              onClick={onToggle}
              ml={2}
            >
              {open ? <ChevronUp /> : <ChevronDown />}
            </IconButton>
          </Flex>
        </Card.Header>
        <Collapsible.Root open={open} lazyMount>
          <Collapsible.Content>
            <Card.Body pt={0}>{children}</Card.Body>
          </Collapsible.Content>
        </Collapsible.Root>
      </Card.Root>
    </Box>
  );
}
