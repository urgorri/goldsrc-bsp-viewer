### Description
Add collision detection against BSP clipping hulls (`CLIPNODE` lump) and gravity physics to support a true "Walk Mode" alongside the default "Noclip Mode".

### Background & Context
The current camera navigation in `Navigator.ts` operates purely as flying noclip. Implementing BSP hull collision checking against GoldSrc hull 0 (player standing) or hull 1 (crouching) will allow users to experience maps with authentic player collision, stair climbing, and gravity physics.

### Proposed Changes
1. **`Navigator.ts`**:
   - Add `movementMode: 'noclip' | 'walk'` property.
   - Implement raycasting / BSP tree node traversal checking player position against `clipnodes` or face planes.
   - Add gravity acceleration, jumping, and ground collision detection.
2. **Controls Cheat Sheet**:
   - Add hotkey `V` to toggle between Walk Mode and Noclip Mode.

### Code References
- [`src/engine/Navigator.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/engine/Navigator.ts)
- [`src/parsers/BspParser.ts`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/src/parsers/BspParser.ts) (`LUMP_CLIPNODES` / `LUMP_PLANES`)
