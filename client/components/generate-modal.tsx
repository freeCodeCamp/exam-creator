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
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { putGenerateExam } from "../utils/fetch";

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedExamIds: string[];
  databaseEnvironment: "staging" | "production";
}

export function GenerateModal({
  isOpen,
  onClose,
  selectedExamIds,
  databaseEnvironment,
}: GenerateModalProps) {
  const [val, setVal] = useState("");
  const [count, setCount] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const abortRef = useRef<AbortController | null>(null);
  const toast = useToast();

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVal(e.target.value);
  }

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      const init: Record<string, number> = {};
      for (const id of selectedExamIds) init[id] = 0;
      setProgress(init);
      setError(null);
      setIsGenerating(false);
      setCount(1);
      abortRef.current = new AbortController();
    } else {
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [isOpen, selectedExamIds]);

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

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      await Promise.all(
        selectedExamIds.map(async (examId) => {
          const stream = await putGenerateExam({
            examId,
            count,
            databaseEnvironment,
          });
          let latest = 0;
          for await (const msg of iterateJsonLines(stream)) {
            // Server sends { count: i (0-based), examId }
            const soFar =
              typeof msg.count === "number" ? msg.count + 1 : latest + 1;
            latest = soFar;
            setProgress((prev) => ({ ...prev, [examId]: soFar }));
          }
          // Ensure we mark complete if stream ended without last line
          // Stream can timeout before all generations are done
          // setProgress((prev) => ({
          //   ...prev,
          //   [examId]: Math.max(prev[examId] ?? 0, count),
          // }));
        })
      );
      const isAllExamsGenerated = selectedExamIds.every(
        (id) => (progress[id] ?? 0) >= count
      );

      if (!isAllExamsGenerated) {
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
          {Object.keys(progress).length > 0 && (
            <Stack mt={3} spacing={3}>
              {selectedExamIds.map((id) => (
                <Stack key={id} spacing={1}>
                  <Text fontSize="sm" color="gray.300">
                    {id}
                  </Text>
                  <Progress
                    size="sm"
                    colorScheme="yellow"
                    value={progress[id] ?? 0}
                    max={count}
                    hasStripe
                    isAnimated
                  />
                  <Text fontSize="xs" color="gray.400">
                    {progress[id] ?? 0}/{count}
                  </Text>
                </Stack>
              ))}
            </Stack>
          )}
          {error && (
            <Text mt={3} color="red.300">
              {error}
            </Text>
          )}

          <FormControl
            isInvalid={val !== `generate ${databaseEnvironment}`}
            mt={4}
          >
            <FormLabel>Confirmation</FormLabel>
            <Input type="text" value={val} onChange={handleInputChange} />
            <FormHelperText color="#c4c8d0">
              Type "generate {databaseEnvironment}" to confirm
            </FormHelperText>
          </FormControl>

          <FormControl mt={4}>
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
              selectedExamIds.length === 0 ||
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
