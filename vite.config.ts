import { defineConfig } from "vite";

const proxyMock = {
  "/api/v1": {
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
