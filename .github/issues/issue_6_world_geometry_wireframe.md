### Description
Add an option to toggle wireframe overlays for all worldspawn map brushes (world geometry), extending the existing wireframe feature beyond brush entities.

### Background & Context
Currently, `showBrushWireframes` in `MapRenderer.ts` (lines 30, 68) only generates and displays wireframe line overlays for brush entities in `brushEntitiesGroup`. World geometry (`worldGroup`) does not have wireframe overlays enabled, making it impossible to visualize full BSP world polygon breakdown.

### Proposed Changes
1. **`BspViewerOptions`**:
   - Add `showWorldWireframes?: boolean` (default: `false`).
2. **`MapRenderer.ts`**:
   - Generate `THREE.WireframeGeometry` / `THREE.LineSegments` overlays for meshes inside `worldGroup` during map building.
   - Group world wireframes in a dedicated `worldWireframesGroup: THREE.Group`.
   - Implement `setWorldWireframesVisible(visible: boolean)` to toggle visibility on demand.
3. **UI Integration**:
   - Add "Show World Wireframes" checkbox in settings modal (`docs/index.html`).

### Code References
- [`src/engine/MapRenderer.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/engine/MapRenderer.ts#L30) (`brushWireframesVisible`)
- [`src/engine/MapRenderer.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/engine/MapRenderer.ts#L54-L62) (`worldGroup` construction and lifecycle)
