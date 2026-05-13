import { useQuery } from "@tanstack/react-query";
import { getExamAttemptStarts } from "../utils/fetch";

export function AttemptStats() {
  const examAttemptStartsQuery = useQuery({
    queryKey: ["attempt-metrics"],
    queryFn: () => getExamAttemptStarts(),
    retry: false,
    refetchOnWindowFocus: false,
  });
}
