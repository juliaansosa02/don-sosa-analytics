import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    build: {
        minify: 'esbuild'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.mjs', '.js', '.mts', '.jsx', '.json']
    },
    server: {
        port: 5173
    }
});
