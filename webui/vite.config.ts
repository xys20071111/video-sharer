import { defineConfig } from "vite";
import deno from "@deno/vite-plugin";

export default defineConfig({
  root: ".",
  plugins: [deno()],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  server: {
    port: 5173,
  },
});
