import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      include: ['src'],
      exclude: ['src/main.tsx', 'src/App.tsx'],
      insertTypesEntry: true,
      rollupTypes: true,
      tsconfigPath: resolve(__dirname, 'tsconfig.app.json'),
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'GoldSrcBspViewer',
      fileName: (format) => {
        if (format === 'es') return 'goldsrc-bsp-viewer.js';
        return `goldsrc-bsp-viewer.${format}.cjs`;
      },
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['three', 'react', 'react-dom', 'react/jsx-runtime', 'lucide-react'],
      output: {
        globals: {
          three: 'THREE',
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          'lucide-react': 'lucide'
        }
      }
    }
  }
})
