import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [
        react(),
    ],
    base: '/',
    build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: undefined
            }
        }
    },
    server: {
        proxy: mode === 'development' ? {
            // Proxy LLM backend calls to local backend server in dev
            '/llm': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false,
            }
        } : undefined
    }
}))
