import {
  Button,
  FormControl,
  Text,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";

interface SeedStagingModalProps {
  isOpen: boolean;
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
  isOpen,
  onClose,
  handleSeedSelectedToStaging,
  seedExamToStagingMutation,
}: SeedStagingModalProps) {
  const [val, setVal] = useState("");

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVal(e.target.value);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setVal("");
        onClose();
      }}
    >
      <ModalOverlay />
      <ModalContent backgroundColor={"gray.700"} color={"white"}>
        <ModalHeader>Modal Title</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {seedExamToStagingMutation.isPending ? (
            <Text>Seeding exams to staging in progress...</Text>
          ) : (
            <Text>
              This is a potentially destructive action. Are you sure you want to
              seed the staging database with the selected exams?
            </Text>
          )}

          <FormControl isInvalid={val !== "seed staging"} mt={4}>
            <FormLabel>Confirmation</FormLabel>
            <Input type="text" value={val} onChange={handleInputChange} />
            <FormHelperText color="#c4c8d0">
              Type "seed staging" to confirm
            </FormHelperText>
          </FormControl>
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="blue"
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
            colorScheme="yellow"
            onClick={() => {
              setVal("");
              handleSeedSelectedToStaging();
            }}
            isDisabled={val !== "seed staging"}
            loadingText="Seeding..."
            isLoading={seedExamToStagingMutation.isPending}
          >
            Seed Staging
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

interface SeedProductionModalProps {
  isOpen: boolean;
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
  isOpen,
  onClose,
  handleSeedSelectedToProduction,
  seedExamToProductionMutation,
}: SeedProductionModalProps) {
  const [val, setVal] = useState("");

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVal(e.target.value);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setVal("");
        onClose();
      }}
    >
      <ModalOverlay />
      <ModalContent backgroundColor={"gray.700"} color={"white"}>
        <ModalHeader>Modal Title</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {seedExamToProductionMutation.isPending ? (
            <Text>Seeding exams to production in progress...</Text>
          ) : (
            <Text>
              This is a potentially destructive action. Are you sure you want to
              seed the production database with the selected exams?
            </Text>
          )}

          <FormControl isInvalid={val !== "seed production"} mt={4}>
            <FormLabel>Confirmation</FormLabel>
            <Input type="text" value={val} onChange={handleInputChange} />
            <FormHelperText color="#c4c8d0">
              Type "seed production" to confirm
            </FormHelperText>
          </FormControl>
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="blue"
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
            colorScheme="yellow"
            onClick={() => {
              setVal("");
              handleSeedSelectedToProduction();
            }}
            isDisabled={val !== "seed production"}
            loadingText="Seeding..."
            isLoading={seedExamToProductionMutation.isPending}
          >
            Seed Production
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
