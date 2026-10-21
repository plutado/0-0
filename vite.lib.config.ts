import { defineConfig } from 'vite';

// Library build: an ES module for the programmatic API and a separate
// entry that registers the <zero-zero-player> custom element.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: {
        'zero-zero': 'src/index.ts',
        element: 'src/element.ts',
      },
      formats: ['es'],
    },
  },
});
