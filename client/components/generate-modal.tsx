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
  Stack,
} from "@chakra-ui/react";
import { UseQueryResult } from "@tanstack/react-query";
import { useState } from "react";

interface GenerateStagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  handleGenerateSelectedToStaging: () => void;
  generateExamToStagingMutation: UseQueryResult<Response[], Error>;
}

export function GenerateStagingModal({
  isOpen,
  onClose,
  handleGenerateSelectedToStaging,
  generateExamToStagingMutation,
}: GenerateStagingModalProps) {
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
          {generateExamToStagingMutation.isPending ? (
            <>
              <Text>Generating exams to staging in progress...</Text>
              <Stack></Stack>
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
              handleGenerateSelectedToStaging();
            }}
            isDisabled={val !== "generate staging"}
            loadingText="Generating..."
            isLoading={generateExamToStagingMutation.isPending}
          >
            Generate in Staging
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
