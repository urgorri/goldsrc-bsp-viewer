import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        dts({
            include: ['src'],
            exclude: ['src/main.tsx', 'src/App.tsx', 'src/components/MapLoader.tsx'],
            insertTypesEntry: true,
            rollupTypes: true,
            tsconfigPath: resolve(__dirname, 'tsconfig.app.json'),
        })
    ],
});
