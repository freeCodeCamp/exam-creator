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
} from "@chakra-ui/react";
import { UseQueryResult } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { putGenerateExam } from "../utils/fetch";

interface GenerateStagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  handleGenerateSelectedToStaging: () => void;
  generateExamToStagingMutation: UseQueryResult<Response[], Error>;
  selectedExamIds: string[];
}

export function GenerateStagingModal({
  isOpen,
  onClose,
  handleGenerateSelectedToStaging: _handleGenerateSelectedToStaging,
  generateExamToStagingMutation: _generateExamToStagingMutation,
  selectedExamIds,
}: GenerateStagingModalProps) {
  const [val, setVal] = useState("");
  const [count, setCount] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const abortRef = useRef<AbortController | null>(null);

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

  // Helper: iterate JSON NL from stream (ReadableStream or AsyncIterable)
  async function* iterateJsonLines(
    stream: AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>
  ) {
    // Normalize to async iterator
    const textDecoder = new TextDecoder("utf-8");
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let iter: AsyncIterable<Uint8Array> | null = null;

    if (typeof (stream as any).getReader === "function") {
      // ReadableStream path
      reader = (stream as ReadableStream<Uint8Array>).getReader();
    } else if (Symbol.asyncIterator in (stream as any)) {
      iter = stream as AsyncIterable<Uint8Array>;
    } else {
      throw new Error("Unsupported stream type from putGenerateExam");
    }

    let buffer = "";

    if (reader) {
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

    // AsyncIterable path
    for await (const chunk of iter!) {
      buffer += textDecoder.decode(chunk, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        try {
          yield JSON.parse(line);
        } catch {
          // ignore invalid
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
  }

  async function startGeneration() {
    setIsGenerating(true);
    setError(null);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      await Promise.all(
        selectedExamIds.map(async (examId) => {
          const stream = await putGenerateExam({ examId, count });
          let latest = 0;
          for await (const msg of iterateJsonLines(stream)) {
            // Server sends { count: i (0-based), examId }
            const soFar =
              typeof msg.count === "number" ? msg.count + 1 : latest + 1;
            latest = soFar;
            setProgress((prev) => ({ ...prev, [examId]: soFar }));
          }
          // Ensure we mark complete if stream ended without last line
          setProgress((prev) => ({
            ...prev,
            [examId]: Math.max(prev[examId] ?? 0, count),
          }));
        })
      );
    } catch (e: any) {
      setError(e?.message ?? "Generation failed");
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
        <ModalHeader>Generate Exams to Staging</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isGenerating ? (
            <>
              <Text>Generating exams to staging in progress...</Text>
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
              {error && (
                <Text mt={3} color="red.300">
                  {error}
                </Text>
              )}
            </>
          ) : (
            <Text>
              This is a potentially destructive action. Are you sure you want to
              generate the staging database with the selected exams?
            </Text>
          )}

          <FormControl isInvalid={val !== "generate staging"} mt={4}>
            <FormLabel>Confirmation</FormLabel>
            <Input type="text" value={val} onChange={handleInputChange} />
            <FormHelperText color="#c4c8d0">
              Type "generate staging" to confirm
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
              val !== "generate staging" ||
              selectedExamIds.length === 0 ||
              count < 1 ||
              count > 100
            }
            loadingText="Generating..."
            isLoading={isGenerating}
          >
            Generate in Staging
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
