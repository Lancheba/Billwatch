// Centralized `meta` typing for TanStack Query.
//
// Every useQuery/useMutation call in src/pages/**.tsx attaches a
// `meta.errorMessage` (and, for mutations, an optional `meta.successMessage`)
// describing what went right/wrong in plain language. The global
// `QueryCache` / `MutationCache` handlers wired up in App.tsx read this
// meta and surface it as a toast (see toast.ts + ToastContainer.tsx), so
// individual pages get consistent error/success notifications for free
// instead of each page inventing its own alert()/local-state handling.
//
// This file just registers the shape of that meta object with TanStack
// Query's `Register` interface so `query.meta?.errorMessage` etc. is typed
// instead of `unknown` everywhere it's used.

export interface QueryMeta extends Record<string, unknown> {
  /** Shown as an error toast when this query fails. Omit to fail silently (still logged to console). */
  errorMessage?: string
}

export interface MutationMeta extends Record<string, unknown> {
  /** Shown as an error toast when this mutation fails. Falls back to a generic message if omitted. */
  errorMessage?: string
  /** Shown as a success toast when this mutation succeeds. Omit for no success toast. */
  successMessage?: string
}

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: QueryMeta
    mutationMeta: MutationMeta
  }
}
