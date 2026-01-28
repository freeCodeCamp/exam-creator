import { useInfiniteQuery } from "@tanstack/react-query";
import { getModerations } from "../utils/fetch";
import { ExamEnvironmentExamModerationStatus } from "@prisma/client";

interface ModerationInfiniteQueryProps {
  moderationStatusFilter: ExamEnvironmentExamModerationStatus;
  sort: number;
}

export const moderationKeys = {
  all: ["filteredModerations"] as const,
  moderations: (keys: unknown[]) => [...moderationKeys.all, ...keys] as const,
};

export function moderationsInfiniteQuery({
  moderationStatusFilter,
  sort,
}: ModerationInfiniteQueryProps) {
  const q = useInfiniteQuery({
    queryKey: moderationKeys.moderations([moderationStatusFilter, sort]),
    queryFn: ({ pageParam }) => {
      if (pageParam === null) {
        return [];
      }
      return getModerations({
        status: moderationStatusFilter,
        limit: 5,
        skip: pageParam,
        // exam: examFilter?.id,
        sort,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 5) {
        return null;
      }
      return allPages.flat().length;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  return q;
}
