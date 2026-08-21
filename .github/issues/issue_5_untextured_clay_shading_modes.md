### Description
Add alternative rendering modes to view map geometry without textures (Clay/Untextured mode) with flat or smooth shading options using lightmap data or vertex normals.

### Background & Context
Level designers and 3D artists frequently need to inspect raw BSP geometry flow, brush alignment, and lightmap distribution without diffuse textures cluttering the view. Providing untextured (clay) and lightmap-only rendering modes allows thorough architectural audit.

### Proposed Changes
1. **`BspViewerOptions`**:
   - Add `renderMode?: 'textured' | 'untextured' | 'lightmapOnly' | 'normals'` (default: `'textured'`).
   - Add `shadingMode?: 'flat' | 'smooth'` (default: `'flat'`).
2. **`Shaders.ts` & `MapRenderer.ts`**:
   - Update `bspShader` fragment shader to accept a `uRenderMode` uniform:
     - `textured`: Blends diffuse WAD texture with lightmap texture.
     - `untextured`: Replaces diffuse texture with neutral clay color (`vec3(0.7)`), lit by lightmap or normal vectors.
     - `lightmapOnly`: Renders pure lightmap atlas texture values across geometry.
     - `normals`: Visualizes surface normals.
   - Update material uniforms dynamically when `setOptions({ renderMode, shadingMode })` is invoked.
3. **UI Control**:
   - Add dropdown select for Render Mode in settings modal (`docs/index.html`).

### Code References
- [`src/engine/Shaders.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/engine/Shaders.ts) (`bspShader` GLSL definition)
- [`src/engine/MapRenderer.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/engine/MapRenderer.ts#L86-L90) (`materialCache` uniforms management)
