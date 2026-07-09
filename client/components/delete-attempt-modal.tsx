import { Button, Dialog, Field, Input, Text } from "@chakra-ui/react";
import { useState } from "react";

const CONFIRM_PHRASE = "delete attempt and moderation";

interface DeleteAttemptModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  attemptId: string;
  isPending?: boolean;
}

export function DeleteAttemptModal({
  open,
  onClose,
  onConfirm,
  attemptId,
  isPending = false,
}: DeleteAttemptModalProps) {
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
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content backgroundColor={"gray.700"} color={"white"}>
          <Dialog.Header>Delete Attempt + Moderation</Dialog.Header>
          <Dialog.CloseTrigger />
          <Dialog.Body>
            {isPending ? (
              <Text>Deleting attempt and moderation...</Text>
            ) : (
              <>
                <Text>
                  This is a destructive action. This deletes the attempt and its
                  associated moderation record.
                </Text>
                <Text mt={2} fontFamily="mono" fontSize="sm">
                  {attemptId}
                </Text>
              </>
            )}

            <Field.Root invalid={val !== CONFIRM_PHRASE} mt={4}>
              <Field.Label>Confirmation</Field.Label>
              <Input type="text" value={val} onChange={handleInputChange} />
              <Field.HelperText color="#c4c8d0">
                Type "{CONFIRM_PHRASE}" to confirm
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
              colorPalette="red"
              onClick={() => {
                setVal("");
                onConfirm();
              }}
              disabled={val !== CONFIRM_PHRASE}
              loadingText="Deleting..."
              loading={isPending}
            >
              Delete + Moderation
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
