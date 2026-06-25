const { build } = require("vite");
const react = require("@vitejs/plugin-react");
const { resolve } = require("path");

build({
  root: resolve(__dirname, ".."),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "../dist"),
    emptyOutDir: true,
  },
});
