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

/**
 * Recipient calls answer with the recipient, not the whole state, and they
 * change which actions are real, so the state is fetched again afterwards.
 */
function useRecipientMutation<V, R>(fn: (variables: V) => Promise<R>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => client.invalidateQueries({ queryKey: stateKey }),
  });
}

export const useAddRecipient = () => useRecipientMutation(api.addRecipient);

export const useVerifyRecipient = () =>
  useRecipientMutation(({ id, code }: { id: string; code: string }) =>
    api.verifyRecipient(id, code),
  );

export const useRemoveRecipient = () =>
  useRecipientMutation(api.removeRecipient);

export const usePreview = () => useMutation({ mutationFn: api.preview });

export function useStartRun() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.startRun,
    onSuccess: ({ mode }, { actionId }) => {
      setRunning(client, actionId, true);
      // The confirmed send now counts toward the limits.
      if (mode === "real")
        void client.invalidateQueries({ queryKey: stateKey });
    },
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

/** Results are not stored on the server, so they live in the mutation's data. */
export const useFinder = () => useMutation({ mutationFn: api.finder });

export const useHangUp = () => useMutation({ mutationFn: api.hangUp });
