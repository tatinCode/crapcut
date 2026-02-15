import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build:{
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                //popup html entry
                popup: resolve(__dirname, 'src/popup/popup.html'),

                //background script entry
                background: resolve(__dirname, 'src/background/background.ts'),

                //content script entry
                content: resolve(__dirname, 'src/content/content.ts')
            },
            output: {
                //output file name pattern
                entryFileNames: (chunk) => {
                    if (chunk.name === 'background') {
                        return 'background/background.js';
                    }
                    if (chunk.name === 'content') {
                        return 'content/content.js';
                    }
                    return "assets/[name].js";
                }
            }
        }
    }
});
