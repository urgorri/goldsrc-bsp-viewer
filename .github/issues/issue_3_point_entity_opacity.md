### Description
Add a dynamic configuration option and UI control to adjust the opacity of rendered point entity markers in the 3D scene.

### Background & Context
Point entity meshes are currently initialized with a hardcoded `opacity: 0.8` on `THREE.MeshBasicMaterial` inside `EntityRenderer.ts`. Allowing users to dynamically adjust point entity opacity (from `0.0` invisible to `1.0` solid) improves scene clarity when inspecting dense maps filled with entities.

### Proposed Changes
1. **`BspViewerOptions`**:
   - Add `pointEntityOpacity?: number` (range: `0.0` to `1.0`, default: `0.8`).
2. **`EntityRenderer.ts` & `MapRenderer.ts`**:
   - Store generated point entity materials in a collection.
   - Implement `setPointEntityOpacity(opacity: number)` method to update material opacity values dynamically without re-creating geometries.
3. **Showcase UI & React Component**:
   - Add opacity slider in settings modal (`docs/index.html` & `docs/app.js`).
   - Expose `pointEntityOpacity` prop in `ViewerCanvas.tsx`.

### Code References
- [`src/engine/EntityRenderer.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/engine/EntityRenderer.ts#L41) (`opacity: 0.8`)
- [`src/core/BspViewer.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/core/BspViewer.ts#L20) (`aaaTriggerOpacity` reference implementation)
- [`src/components/ViewerCanvas.tsx`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/components/ViewerCanvas.tsx)
