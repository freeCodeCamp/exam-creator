import {
  Button,
  Field,
  Text,
  Input,
  Dialog,
  DialogCloseTrigger,
} from "@chakra-ui/react";
import { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";

interface SeedStagingModalProps {
  open: boolean;
  onClose: () => void;
  handleSeedSelectedToStaging: () => void;
  seedExamToStagingMutation: UseMutationResult<
    Response[],
    Error,
    string[],
    unknown
  >;
}

export function SeedStagingModal({
  open,
  onClose,
  handleSeedSelectedToStaging,
  seedExamToStagingMutation,
}: SeedStagingModalProps) {
  const [val, setVal] = useState("");

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVal(e.target.value);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={() => {
        setVal("");
        onClose();
      }}
    >
      <Dialog.Content backgroundColor={"gray.700"} color={"white"}>
        <Dialog.Header>Modal Title</Dialog.Header>
        <DialogCloseTrigger />
        <Dialog.Body>
          {seedExamToStagingMutation.isPending ? (
            <Text>Seeding exams to staging in progress...</Text>
          ) : (
            <Text>
              This is a potentially destructive action. Are you sure you want to
              seed the staging database with the selected exams?
            </Text>
          )}

          <Field.Root invalid={val !== "seed staging"} mt={4}>
            <Field.Label>Confirmation</Field.Label>
            <Input type="text" value={val} onChange={handleInputChange} />
            <Field.HelperText color="#c4c8d0">
              Type "seed staging" to confirm
            </Field.HelperText>
          </Field.Root>
        </Dialog.Body>

        <Dialog.Footer>
          <Button
            colorPalette="blue"
            mr={3}
            onClick={() => {
              setVal("");
              onClose();
            }}
          >
            Close
          </Button>
          <Button
            variant={"outline"}
            colorPalette="yellow"
            onClick={() => {
              setVal("");
              handleSeedSelectedToStaging();
            }}
            disabled={val !== "seed staging"}
            loadingText="Seeding..."
            loading={seedExamToStagingMutation.isPending}
          >
            Seed Staging
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

interface SeedProductionModalProps {
  open: boolean;
  onClose: () => void;
  handleSeedSelectedToProduction: () => void;
  seedExamToProductionMutation: UseMutationResult<
    Response[],
    Error,
    string[],
    unknown
  >;
}

export function SeedProductionModal({
  open,
  onClose,
  handleSeedSelectedToProduction,
  seedExamToProductionMutation,
}: SeedProductionModalProps) {
  const [val, setVal] = useState("");

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVal(e.target.value);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={() => {
        setVal("");
        onClose();
      }}
    >
      <Dialog.Content backgroundColor={"gray.700"} color={"white"}>
        <Dialog.Header>Modal Title</Dialog.Header>
        <Dialog.CloseTrigger />
        <Dialog.Body>
          {seedExamToProductionMutation.isPending ? (
            <Text>Seeding exams to production in progress...</Text>
          ) : (
            <Text>
              This is a potentially destructive action. Are you sure you want to
              seed the production database with the selected exams?
            </Text>
          )}

          <Field.Root invalid={val !== "seed production"} mt={4}>
            <Field.Label>Confirmation</Field.Label>
            <Input type="text" value={val} onChange={handleInputChange} />
            <Field.HelperText color="#c4c8d0">
              Type "seed production" to confirm
            </Field.HelperText>
          </Field.Root>
        </Dialog.Body>

        <Dialog.Footer>
          <Button
            colorPalette="blue"
            mr={3}
            onClick={() => {
              setVal("");
              onClose();
            }}
          >
            Close
          </Button>
          <Button
            variant={"outline"}
            colorPalette="yellow"
            onClick={() => {
              setVal("");
              handleSeedSelectedToProduction();
            }}
            disabled={val !== "seed production"}
            loadingText="Seeding..."
            loading={seedExamToProductionMutation.isPending}
          >
            Seed Production
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
