import {
  Button,
  Field,
  Text,
  Input,
  NumberInput,
  Dialog,
  DialogBody,
  Stack,
  Progress,
  NativeSelect,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { putGenerateExam } from "../utils/fetch";
import { queryClient } from "../contexts";
import { toaster } from "./toaster";

interface GenerateModalProps {
  open: boolean;
  onClose: () => void;
  examId: string;
}

export function GenerateModal({ open, onClose, examId }: GenerateModalProps) {
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

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVal(e.target.value);
  }

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
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
  }, [open, examId]);

  function clampCount(n: number) {
    if (Number.isNaN(n)) return 1;
    return Math.max(1, Math.min(100, Math.floor(n)));
  }

  // Helper: iterate JSON NL from ReadableStream
  async function* iterateJsonLines(
    stream: ReadableStream<Uint8Array<ArrayBuffer>>,
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
        toaster.create({
          title: `Generation Timeout in ${databaseEnvironment}`,
          description: `Generation process timed out before all exams could be generated. Please try again.`,
          type: "warning",
          duration: 7000,
          closable: true,
        });
      } else {
        toaster.create({
          title: `Generated Exams to ${databaseEnvironment}`,
          description: `All generated exams have been seeded to the database.`,
          type: "success",
          duration: 5000,
          closable: true,
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
    <Dialog.Root
      open={open}
      onOpenChange={() => {
        setVal("");
        setCount(1);
        setIsGenerating(false);
        setError(null);
        setGenerationAlgorithmErrors([]);
        onClose();
      }}
    >
      <Dialog.Content backgroundColor={"gray.700"} color={"white"}>
        <Dialog.Header>Generate Exams to {databaseEnvironment}</Dialog.Header>
        <Dialog.CloseTrigger />
        <DialogBody>
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
          <Stack mt={3} gap={3}>
            <Stack key={examId} gap={1}>
              <Text fontSize="sm" color="gray.300">
                {examId}
              </Text>
              <Progress.Root
                size="sm"
                colorPalette="yellow"
                value={progress ?? 0}
                max={count}
                striped
                animated
              >
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
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
            <Stack mt={3} gap={2}>
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
          <Field.Root disabled={isGenerating}>
            <Field.Label>Database Environment</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                onChange={(e) => {
                  const value = e.currentTarget.value as
                    | "Staging"
                    | "Production";
                  setDatabaseEnvironment(value);
                }}
                value={databaseEnvironment}
              >
                <option value="Staging">Staging</option>
                <option value="Production">Production</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

          <Field.Root
            invalid={val !== `generate ${databaseEnvironment}`}
            disabled={isGenerating}
            mt={4}
          >
            <Field.Label>Confirmation</Field.Label>
            <Input type="text" value={val} onChange={handleInputChange} />
            <Field.HelperText color="#c4c8d0">
              Type "generate {databaseEnvironment}" to confirm
            </Field.HelperText>
          </Field.Root>

          <Field.Root mt={4} disabled={isGenerating}>
            <Field.Label>Number of Generations</Field.Label>
            <NumberInput.Root
              min={1}
              max={100}
              value={count.toString()}
              onValueChange={(v) => {
                const next = clampCount(
                  Number.isNaN(v.valueAsNumber)
                    ? parseInt(v.value)
                    : v.valueAsNumber,
                );
                setCount(next);
              }}
              disabled={isGenerating}
            >
              <NumberInput.Control />
              <NumberInput.Input />
            </NumberInput.Root>
            <Field.HelperText color="#c4c8d0">
              Enter a value between 1 and 100
            </Field.HelperText>
          </Field.Root>
        </DialogBody>

        <Dialog.Footer>
          <Button
            colorPalette="blue"
            mr={3}
            onClick={() => {
              setVal("");
              setCount(1);
              onClose();
            }}
            disabled={isGenerating}
          >
            Close
          </Button>
          <Button
            variant={"outline"}
            colorPalette="yellow"
            onClick={async () => {
              setVal("");
              await startGeneration();
            }}
            disabled={
              val !== `generate ${databaseEnvironment}` ||
              !examId ||
              isGenerating ||
              count < 1 ||
              count > 100
            }
            loadingText="Generating..."
            loading={isGenerating}
          >
            Generate in {databaseEnvironment}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
