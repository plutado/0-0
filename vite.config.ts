import { defineConfig } from 'vite';

declare const process: { env: Record<string, string | undefined> };

// Demo site. The base path defaults to the GitHub Pages project URL
// (https://plutado.github.io/0-0/). Set BASE_PATH=/ when serving from a
// custom domain such as https://0-0.in.
export default defineConfig(({ command }) => ({
  root: 'demo',
  base: process.env.BASE_PATH ?? (command === 'build' ? '/0-0/' : '/'),
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
  },
}));
