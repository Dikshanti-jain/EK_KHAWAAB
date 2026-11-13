import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 2,
        retryDelay: (i) => Math.min(1000 * 2 ** i, 8_000),
        // This is a poetry feed, not a trading terminal: a tab switch must not
        // cost a database query.
        refetchOnWindowFocus: false,
        // A flaky connection serves the cached page instead of an error.
        networkMode: "offlineFirst",
      },
      mutations: { retry: 0 },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
