import type { ExamCreatorExam } from "@prisma/client";
import { useEffect, useRef } from "react";
import { useImmer } from "use-immer";
import { deserializeToPrisma, serializeFromPrisma } from "../utils/serde";

// Simple WebSocket wrapper for collaborative editing
// TODO: Does not work reliably
export function useCollabExam(examId: string, initialExam: ExamCreatorExam) {
  const [exam, setExam] = useImmer<ExamCreatorExam>(initialExam);
  const wsRef = useRef<WebSocket | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Connect to WebSocket server
  useEffect(() => {
    // Replace with your actual WebSocket server URL
    const ws = new WebSocket(`/ws/exam/${examId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "exam-update" && msg.data) {
        setExam(deserializeToPrisma(msg.data));
      }
    };

    return () => {
      ws.close();
    };
  }, [examId, setExam]);

  // Send exam updates over WebSocket, debounced
  const sendExamUpdate = (nextExam: ExamCreatorExam) => {
    setExam(nextExam);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // @ts-expect-error Nodejs type used for some reason
    debounceRef.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "exam-update",
            data: serializeFromPrisma(nextExam),
          })
        );
      }
    }, 300); // 300ms debounce
  };

  return [exam, sendExamUpdate, setExam] as const;
}
