import { defineConfig } from "vite";

const proxyMock = {
  "/api/v1": {
    target: "http://localhost:8787",
    changeOrigin: true,
  },
  // Teselas y fotos deterministas del mock (ver mock/servidor.mjs); mismo
  // origen que la app, así que la CSP real (img-src 'self' ...) no cambia.
  "/_t": {
    target: "http://localhost:8787",
    changeOrigin: true,
  },
  "/_foto": {
    target: "http://localhost:8787",
    changeOrigin: true,
  },
};

export default defineConfig({
  base: "/villaradar-app/",
  build: {
    target: "es2022",
    sourcemap: false,
  },
  server: { proxy: proxyMock },
  preview: { proxy: proxyMock },
});
