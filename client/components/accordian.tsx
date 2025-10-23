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
  borderColor = "gray.700",
  borderStyle = "solid",
  borderWidth = "1px",
  generationCount,
  isLoading = false,
  dualBorder = false,
  stagingCount,
  productionCount,
}: AccordionProps) {
  const { isOpen, onToggle } = useDisclosure();

  return (
    <Box position="relative" mb={4}>
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
      <Card
        bg="gray.800"
        borderRadius="xl"
        boxShadow="md"
        borderWidth={isLoading ? "0" : borderWidth}
        borderColor={borderColor}
        borderStyle={borderStyle}
        position="relative"
        zIndex={1}
        sx={
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
            spacing={1}
            zIndex={1}
          >
            <Badge
              colorScheme="yellow"
              fontSize="xs"
              px={2}
              py={1}
              borderRadius="md"
              bg="yellow.500"
              color="white"
            >
              S: {stagingCount}
            </Badge>
            <Badge
              colorScheme="green"
              fontSize="xs"
              px={2}
              py={1}
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
            colorScheme={
              borderColor === "green.400"
                ? "green"
                : borderColor === "yellow.400"
                ? "yellow"
                : "red"
            }
            fontSize="xs"
            px={2}
            py={1}
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
        <CardHeader
          px={4}
          py={3}
          cursor="pointer"
          onClick={onToggle}
          _hover={{ bg: "gray.700" }}
        >
          <Flex align="center" justify="space-between">
            <Box maxW="100%" overflowX="auto">
              <Heading size="md" color="teal.300" maxW="100%">
                {title}
              </Heading>
              <Box
                color="gray.300"
                fontSize="sm"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(subtitle) }}
                whiteSpace="pre-line"
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
          {isOpen && <CardBody pt={0}>{children}</CardBody>}
        </Collapse>
      </Card>
    </Box>
  );
}
