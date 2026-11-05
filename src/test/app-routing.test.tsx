import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

describe("App routing & SEO route resolution", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  const validRoutes = [
    "/",
    "/feed",
    "/explore",
    "/ai-poet",
    "/studio",
    "/card-studio",
    "/letters",
    "/secret-letters",
    "/dictionary",
    "/dictionary/tagaful",
    "/topic/heartbreak-shayari",
    "/guidelines",
    "/privacy",
  ];

  for (const path of validRoutes) {
    it(`matches valid route for ${path} without falling back to not-found`, () => {
      const matches = router.matchRoutes(path);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
    });
  }
});
