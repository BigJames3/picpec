import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var apiUrl = env.VITE_API_URL || 'http://127.0.0.1:3000';
    return {
        plugins: [react()],
        resolve: {
            alias: { '@': path.resolve(__dirname, './src') },
        },
        server: {
            port: 5173,
            proxy: {
                '/api': { target: apiUrl, changeOrigin: true },
                '/docs': { target: apiUrl, changeOrigin: true },
            },
        },
    };
});
