import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { User } from "@/lib/types";

// Shared session probe. `undefined` while loading, `null` when signed out.
export function useCurrentUser() {
  const query = useQuery<User | null>({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await apiGet<User>("/auth/me");
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 30_000,
  });
  return { user: query.data ?? null, isLoading: query.isLoading };
}
