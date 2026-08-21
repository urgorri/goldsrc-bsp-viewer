### Description
Add a customizable 3D Grid overlay helper to the WebGL scene with configurable grid spacing, divisions, and colors.

### Background & Context
When inspecting level architecture or entity placements, having a 3D ground/spatial grid aligned with GoldSrc Hammer units (e.g. 16, 32, 64, 128 units) provides vital spatial reference for level designers and modders.

### Proposed Changes
1. **`BspViewerOptions`**:
   - Add `showGrid?: boolean` (default: `false`).
   - Add `gridSize?: number` (default: `64` units).
   - Add `gridColor?: number` (default: `0x444444`).
2. **`MapRenderer.ts` / `BspViewer.ts`**:
   - Instantiate and manage a `THREE.GridHelper` or custom `THREE.LineSegments` grid.
   - Orient grid appropriately according to GoldSrc coordinate transformations (`convertVector()`).
   - Add dynamic methods: `setShowGrid(visible: boolean)` and `setGridSize(size: number)`.
3. **UI Integration**:
   - Add grid toggle checkbox and grid size selector (16, 32, 64, 128) in settings modal (`docs/index.html`).

### Code References
- [`src/core/BspViewer.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/core/BspViewer.ts#L60) (`showAxes` reference implementation)
- [`src/engine/GeometryGenerator.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/engine/GeometryGenerator.ts#L225) (`convertVector` coordinate mapping)
