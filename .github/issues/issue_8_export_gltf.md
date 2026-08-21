### Description
Add an API utility to export loaded BSP geometry, textures, and lightmaps as a standard glTF 2.0 (`.gltf` / `.glb`) or Wavefront `.obj` file.

### Background & Context
GoldSrc map formats are legacy binary files. Adding a built-in exporter utility allows developers, modders, and 3D artists to convert GoldSrc levels into modern 3D formats for use in Blender, Unreal Engine, Unity, or Godot.

### Proposed Changes
1. **`BspViewer.ts` / `MapRenderer.ts`**:
   - Add `exportToGltf(): Promise<ArrayBuffer>` method utilizing `three/examples/jsm/exporters/GLTFExporter.js`.
   - Embed converted textures, materials, and lightmaps into the exported glTF scene container.
2. **UI Action**:
   - Add "Export Map (glTF)" button in settings modal (`docs/index.html`).

### Code References
- [`src/core/BspViewer.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/core/BspViewer.ts)
- [`src/engine/MapRenderer.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/engine/MapRenderer.ts)
