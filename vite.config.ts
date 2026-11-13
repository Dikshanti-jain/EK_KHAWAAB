// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const nitroPreset = process.env["NITRO_PRESET"] || (process.env["VERCEL"] ? "vercel" : undefined);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  ...(nitroPreset ? { nitro: { preset: nitroPreset } } : {}),

  vite: {
    build: {
      target: "es2020",
      cssCodeSplit: true,
      reportCompressedSize: true,
      rollupOptions: {
        output: {
          // Long-lived vendor chunks. Keeping React and React-DOM in the same
          // group is mandatory: splitting them produces the classic
          // "Cannot read properties of undefined (reading 'createContext')".
          // @tanstack/react-start is deliberately absent — it is server-only.
          //
          // Rolldown (Vite 8) only accepts the function form of manualChunks.
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return undefined;
            if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
            if (/node_modules[\\/]@tanstack[\\/](react-router|react-query)[\\/]/.test(id)) return "tanstack";
            if (/node_modules[\\/]@supabase[\\/]/.test(id)) return "supabase";
            if (/node_modules[\\/]lucide-react[\\/]/.test(id)) return "icons";
            if (/node_modules[\\/]sonner[\\/]/.test(id)) return "sonner";
            return undefined;
          },
        },
      },
    },
  },
});
