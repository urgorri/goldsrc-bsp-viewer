### Description
Add 3D visual sound range spheres and attenuation indicators for ambient sound entities (`ambient_generic`, `speaker`, `env_sound`).

### Background & Context
Sound entities in GoldSrc maps use specific key-values (`radius`, `health`, `volume`) to define audio audibility falloff radii. Visualizing these audio spheres directly in the 3D viewer gives level designers instant insight into audio triggers and sound volume coverage.

### Proposed Changes
1. **`EntityRenderer.ts`**:
   - Detect audio entity classnames (`ambient_generic`, `speaker`).
   - Extract `radius` or attenuation properties from key-values.
   - Render transparent wireframe spheres (`THREE.SphereGeometry` with `THREE.LineBasicMaterial`) representing maximum audibility radius.
2. **`BspViewerOptions`**:
   - Add `showAudioSpheres?: boolean` (default: `false`).

### Code References
- [`src/engine/EntityRenderer.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/engine/EntityRenderer.ts#L22-L35)
- [`src/parsers/FgdParser.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/parsers/FgdParser.ts)
