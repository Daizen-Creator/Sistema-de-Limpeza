import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base relativa para funcionar quando carregado via file:// no Electron empacotado.
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { port: 5173, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
});
