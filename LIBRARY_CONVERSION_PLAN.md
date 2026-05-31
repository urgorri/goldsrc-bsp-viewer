# Plan de Conversión: De Aplicación React a Librería Framework-Agnóstica

Este documento detalla los pasos técnicos necesarios para transformar el motor de renderizado de `goldsrc-bsp-viewer` en una librería NPM instalable y utilizable en cualquier contenedor DOM, sin dependencia obligatoria de React.

## Fase 1: Infraestructura y Sistema de Construcción
El objetivo es preparar el proyecto para generar un paquete distribuible.

- **Configuración de Vite (Library Mode):** Modificar `vite.config.ts` para usar la opción `build.lib`. Se deben generar formatos `es` (ES Modules) y `umd`.
- **Gestión de Dependencias:**
    - Mover `three` a `peerDependencies` en `package.json`.
    - Mover `react` y `react-dom` a `peerDependencies` (opcional) o mantenerlas solo como `devDependencies` si la librería core no las usa.
- **Tipado:** Configurar `vite-plugin-dts` para generar automáticamente los archivos de definición de tipos (`.d.ts`).

## Fase 2: Implementación del Controlador Core (`BspViewer`)
Actualmente, la lógica de integración con Three.js reside en el hook de React dentro de `ViewerCanvas.tsx`. Se debe extraer a una clase pura.

- **Crear `src/core/BspViewer.ts`:**
    - Esta clase será la interfaz principal.
    - Responsabilidades: Inicializar `WebGLRenderer`, `Scene`, `Camera` y `Clock`.
    - Encapsular el bucle de animación (`requestAnimationFrame`).
    - Exponer métodos públicos: `loadMap()`, `setPvsEnabled()`, `setAxesVisible()`, `destroy()`.
    - Manejar el evento `resize` observando el contenedor proporcionado.
- **Refactorizar `MapRenderer.ts`:** Ajustar pequeñas dependencias de callbacks de progreso para que sean puramente basados en eventos o promesas.

## Fase 3: Punto de Entrada y API Pública
Definir qué partes del código serán visibles para los usuarios de la librería.

- **Crear `src/index.ts`:**
    - Exportar la clase principal `BspViewer`.
    - Exportar interfaces de tipos (ej: `BspEntity`, `ViewerOptions`).
    - Exportar los parsers independientes (`BspParser`, `WadParser`, `FgdParser`) para usuarios que solo quieran procesar datos.

## Fase 4: Capa de Compatibilidad (React Wrapper)
Para no romper la funcionalidad actual y ofrecer una mejor experiencia a usuarios de React.

- **Reimplementar `ViewerCanvas.tsx`:** Ahora este componente será simplemente un "wrapper" delgado que instancia la clase `BspViewer` dentro de un `useEffect`.
- Esto permite que el repositorio siga funcionando como una aplicación de demostración mientras sirve como librería.

## Fase 5: Documentación y Ejemplo de Uso
- **README.md:** Actualizar con instrucciones de instalación (`npm install ...`) y un ejemplo de uso en Vanilla JS.
- **Ejemplo de integración mínima:**
  ```javascript
  import { BspViewer } from 'goldsrc-bsp-viewer';

  const viewer = new BspViewer({
    container: document.getElementById('viewer-root'),
    antialias: true
  });

  await viewer.loadMap(bspArrayBuffer, [wadArrayBuffer], fgdString);
  ```

## Fase 6: Publicación y Distribución
- Configurar campos en `package.json`: `main`, `module`, `types`, y `exports`.
- Verificar el bundle final con `npm pack` para asegurar que solo se incluyan los archivos necesarios (dist, README, LICENSE).

---

Este plan permite que el proyecto evolucione de una herramienta interna a un motor de visualización reutilizable por la comunidad de GoldSrc.
