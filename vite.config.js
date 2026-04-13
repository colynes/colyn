import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        tailwindcss(),
        react(),
    ],
    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) {
                        return;
                    }

                    if (id.includes('firebase')) {
                        return 'firebase';
                    }

                    if (id.includes('laravel-echo') || id.includes('pusher-js')) {
                        return 'realtime';
                    }

                    if (id.includes('recharts')) {
                        return 'charts';
                    }

                    if (id.includes('lucide-react') || id.includes('sonner')) {
                        return 'ui';
                    }

                    return 'vendor';
                },
            },
        },
    },
});
