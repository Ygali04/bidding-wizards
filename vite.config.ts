import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { handleDocumentsMiddleware } from "./server/documents-middleware";

function documentsApi(): Plugin {
  return {
    name: "wizbid-documents-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handleDocumentsMiddleware(req, res).then((hit) => {
          if (!hit) next();
        });
      });
    },
  };
}

export default defineConfig({
  // Relative base so GitHub Pages works at / and at /bidding-wizards/.
  base: "./",
  plugins: [react(), tailwindcss(), documentsApi()],
  server: { port: 5173, host: "127.0.0.1" },
  preview: { port: 4173, host: "127.0.0.1" },
});
