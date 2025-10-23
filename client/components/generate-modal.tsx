import {
  Button,
  FormControl,
  Text,
  FormHelperText,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Progress,
  useToast,
  Select,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { putGenerateExam } from "../utils/fetch";
import { queryClient } from "../contexts";

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
}

export function GenerateModal({ isOpen, onClose, examId }: GenerateModalProps) {
  const [val, setVal] = useState("");
  const [count, setCount] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationAlgorithmErrors, setGenerationAlgorithmErrors] = useState<
    string[]
  >([]);
  const [progress, setProgress] = useState(0);
  const [databaseEnvironment, setDatabaseEnvironment] = useState<
    "Staging" | "Production"
  >("Staging");
  const abortRef = useRef<AbortController | null>(null);

  const toast = useToast();

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVal(e.target.value);
  }

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setProgress(0);
      setError(null);
      setGenerationAlgorithmErrors([]);
      setIsGenerating(false);
      setCount(1);
      abortRef.current = new AbortController();
    } else {
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [isOpen, examId]);

  function clampCount(n: number) {
    if (Number.isNaN(n)) return 1;
    return Math.max(1, Math.min(100, Math.floor(n)));
  }

  // Helper: iterate JSON NL from ReadableStream
  async function* iterateJsonLines(
    stream: ReadableStream<Uint8Array<ArrayBuffer>>
  ) {
    const textDecoder = new TextDecoder("utf-8");
    const reader = stream.getReader();

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        buffer += textDecoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          try {
            yield JSON.parse(line);
          } catch {
            // ignore invalid line
          }
        }
      }
    }
    if (buffer.trim().length > 0) {
      try {
        yield JSON.parse(buffer);
      } catch {
        /* ignore */
      }
    }
    return;
  }

  async function startGeneration() {
    setIsGenerating(true);
    setError(null);
    setGenerationAlgorithmErrors([]);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const stream = await putGenerateExam({
        examId,
        count,
        databaseEnvironment,
      });
      let latest = 0;
      const genErrors: string[] = [];
      for await (const msg of iterateJsonLines(stream)) {
        // Server sends { count: i (1-based), examId, error?: string | null }
        const soFar = msg.count;
        latest = soFar;
        setProgress(soFar);
        const error = msg.error;
        if (error) {
          genErrors.push(error);
        }
      }
      // Ensure we mark complete if stream ended without last line
      // Stream can timeout before all generations are done
      const isAllExamsGenerated = latest >= count;

      if (!isAllExamsGenerated) {
        if (latest === 0) {
          const uniqueErrors = Array.from(new Set(genErrors));
          setGenerationAlgorithmErrors(uniqueErrors);
        }
        toast({
          title: `Generation Timeout in ${databaseEnvironment}`,
          description: `Generation process timed out before all exams could be generated. Please try again.`,
          status: "warning",
          duration: 7000,
          isClosable: true,
        });
      } else {
        toast({
          title: `Generated Exams to ${databaseEnvironment}`,
          description: `All generated exams have been seeded to the database.`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }
      await queryClient.refetchQueries({
        queryKey: ["generated-exams", examId, databaseEnvironment],
      });
    } catch (e: unknown) {
      console.error(e);
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("Generation aborted");
      } else if (e instanceof Error) {
        setError(e.message);
      } else if (typeof e === "string") {
        setError(e);
      } else {
        setError("Generation failed. Unknown error - See console.");
      }
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setVal("");
        setCount(1);
        setIsGenerating(false);
        setError(null);
        setGenerationAlgorithmErrors([]);
        onClose();
      }}
    >
      <ModalOverlay />
      <ModalContent backgroundColor={"gray.700"} color={"white"}>
        <ModalHeader>Generate Exams to {databaseEnvironment}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isGenerating ? (
            <>
              <Text>
                Generating exams to {databaseEnvironment} in progress... This
                will timeout if the input number of generations is not generated
                in 10s.
              </Text>
            </>
          ) : (
            <Text>
              This is a potentially destructive action. Are you sure you want to
              generate the {databaseEnvironment} database with the selected
              exams?
            </Text>
          )}
          <Stack mt={3} spacing={3}>
            <Stack key={examId} spacing={1}>
              <Text fontSize="sm" color="gray.300">
                {examId}
              </Text>
              <Progress
                size="sm"
                colorScheme="yellow"
                value={progress ?? 0}
                max={count}
                hasStripe
                isAnimated
              />
              <Text fontSize="xs" color="gray.400">
                {progress ?? 0}/{count}
              </Text>
            </Stack>
          </Stack>
          {error && (
            <Text mt={3} color="red.300">
              {error}
            </Text>
          )}
          {generationAlgorithmErrors.length > 0 && (
            <Stack mt={3} spacing={2}>
              <Text color="orange.300">
                Some errors occurred during generation:
              </Text>
              {generationAlgorithmErrors.map((err, idx) => (
                <Text key={idx} color="orange.200" fontSize="sm">
                  - {err}
                </Text>
              ))}
            </Stack>
          )}
          <FormControl isDisabled={isGenerating}>
            <FormLabel>Database Environment</FormLabel>
            <Select
              value={databaseEnvironment}
              isRequired
              onChange={(e) => {
                const value = e.currentTarget.value as "Staging" | "Production";
                setDatabaseEnvironment(value);
              }}
            >
              <option value="Staging">Staging</option>
              <option value="Production">Production</option>
            </Select>
          </FormControl>

          <FormControl
            isInvalid={val !== `generate ${databaseEnvironment}`}
            isDisabled={isGenerating}
            mt={4}
          >
            <FormLabel>Confirmation</FormLabel>
            <Input type="text" value={val} onChange={handleInputChange} />
            <FormHelperText color="#c4c8d0">
              Type "generate {databaseEnvironment}" to confirm
            </FormHelperText>
          </FormControl>

          <FormControl mt={4} isDisabled={isGenerating}>
            <FormLabel>Number of Generations</FormLabel>
            <NumberInput
              min={1}
              max={100}
              value={count}
              onChange={(valueString, valueNumber) => {
                const next = clampCount(
                  Number.isNaN(valueNumber)
                    ? parseInt(valueString)
                    : valueNumber
                );
                setCount(next);
              }}
              isDisabled={isGenerating}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            <FormHelperText color="#c4c8d0">
              Enter a value between 1 and 100
            </FormHelperText>
          </FormControl>
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="blue"
            mr={3}
            onClick={() => {
              setVal("");
              setCount(1);
              onClose();
            }}
            isDisabled={isGenerating}
          >
            Close
          </Button>
          <Button
            variant={"outline"}
            colorScheme="yellow"
            onClick={async () => {
              setVal("");
              await startGeneration();
            }}
            isDisabled={
              val !== `generate ${databaseEnvironment}` ||
              !examId ||
              isGenerating ||
              count < 1 ||
              count > 100
            }
            loadingText="Generating..."
            isLoading={isGenerating}
          >
            Generate in {databaseEnvironment}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
