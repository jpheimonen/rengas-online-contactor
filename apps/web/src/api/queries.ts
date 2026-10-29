import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { ActionId, AppState, RungId, UnlockRequest } from "@rengas/shared";
import { api } from "./client.ts";

export const stateKey = ["state"] as const;

export function useAppState() {
  return useQuery({ queryKey: stateKey, queryFn: api.state });
}

/** Every mutation answers with the new state, so it goes straight into the cache. */
function useStateMutation<V>(fn: (variables: V) => Promise<AppState>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (state) => client.setQueryData(stateKey, state),
  });
}

export const useSaveTicket = () => useStateMutation(api.saveTicket);

export const useUnlock = () =>
  useStateMutation(
    ({ rungId, body }: { rungId: RungId; body: UnlockRequest }) =>
      api.unlock(rungId, body),
  );

export const useReset = () => useStateMutation(api.reset);

export function useStartRun() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.startRun,
    onSuccess: (_, { actionId }) => setRunning(client, actionId, true),
  });
}

/** Marks an action as running or finished without refetching the whole state. */
export function setRunning(
  client: QueryClient,
  actionId: ActionId,
  running: boolean,
): void {
  client.setQueryData<AppState>(stateKey, (state) => {
    if (!state) return state;
    const others = state.runningActionIds.filter((id) => id !== actionId);
    return {
      ...state,
      runningActionIds: running ? [...others, actionId] : others,
    };
  });
}
