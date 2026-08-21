### Description
Enhance `EntityRenderer` to support variable bounding box dimensions for point entities based on FGD (Forge Game Data) metadata (`size(-minX -minY -minZ, maxX maxY maxZ)`) rather than rendering fixed 8x8x8 cubes for all point entities.

### Background & Context
GoldSrc FGD files specify custom bounding dimensions for specific point entities (e.g. `info_player_start` with `size(-16 -16 -36, 16 16 36)` or `monster_*` entities with custom bounding hulls). While `FgdParser.ts` already parses the `size` property into `[[minX, minY, minZ], [maxX, maxY, maxZ]]`, `EntityRenderer.ts` currently ignores it and hardcodes `new THREE.BoxGeometry(8, 8, 8)`.

### Proposed Changes
1. **`EntityRenderer.ts`**:
   - Extract `min` and `max` vectors from `fgdClass.size`.
   - Calculate width (`maxX - minX`), height (`maxY - minY`), and depth (`maxZ - minZ`).
   - Create a `THREE.BoxGeometry(width, depth, height)` matching GoldSrc coordinate system mapping.
   - Offset geometry center based on `(min + max) / 2` so bounding boxes align properly with entity origin points.
2. **`BspViewerOptions`**:
   - Add `useFgdEntitySizes?: boolean` (default: `true`) to allow toggling between native FGD sizes and uniform cube sizes.

### Code References
- [`src/parsers/FgdParser.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/parsers/FgdParser.ts#L31-L37) (`size` property parser)
- [`src/engine/EntityRenderer.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/engine/EntityRenderer.ts#L36) (`new THREE.BoxGeometry(8, 8, 8)`)
- [`src/core/BspViewer.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/core/BspViewer.ts#L7-L27) (`BspViewerOptions` interface)
