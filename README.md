# GoldSrc BSP Viewer 🎮

[![CI](https://github.com/urgorri/goldsrc-bsp-viewer/actions/workflows/ci.yml/badge.svg)](https://github.com/urgorri/goldsrc-bsp-viewer/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen.svg?style=flat&logo=github)](https://urgorri.github.io/goldsrc-bsp-viewer/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.1.1-blue.svg)](https://github.com/urgorri/goldsrc-bsp-viewer/releases)

A high-performance, framework-agnostic GoldSrc (Half-Life 1) BSP map viewer library built with **Three.js**. It includes full map rendering, WAD3 texture loading, lightmaps, entity parsing, FGD metadata support, and an optional **React** wrapper component (`ViewerCanvas`) for seamless UI integration.

---

## 🌐 Live Demo

Try the interactive showcase directly in your browser:  
👉 **[https://urgorri.github.io/goldsrc-bsp-viewer/](https://urgorri.github.io/goldsrc-bsp-viewer/)**

---

## 🚀 Quick Start (Vanilla JS)

Install the library via npm or GitHub Packages:

```bash
npm install @urgorri/goldsrc-bsp-viewer
```

Integrate it into any DOM container:

```javascript
import { BspViewer } from '@urgorri/goldsrc-bsp-viewer';

// 1. Initialize viewer
const viewer = new BspViewer({
  container: document.getElementById('viewer-root'),
  antialias: true,
  showAxes: true
});

// 2. Load a map from URLs or ArrayBuffers
await viewer.loadMapFromUrls('/maps/c1a2d.bsp', ['/textures/halflife.wad']);
```

---

## ⚛️ React Usage

The library includes a pre-packaged `<ViewerCanvas />` component for React applications.

```tsx
import { ViewerCanvas } from '@urgorri/goldsrc-bsp-viewer';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ViewerCanvas
        pvsEnabled={true}
        showPointEntities={true}
        showAxes={true}
        onProgress={(percent, message) => console.log(`${message}: ${percent}%`)}
        onEntitySelect={(entity) => console.log('Selected:', entity)}
      />
    </div>
  );
}
```

---

## ✨ Key Features

- **🚀 BSP v30 Parsing**: Fast parsing and geometry generation for GoldSrc map files.
- **🖼️ WAD3 & Embedded Textures**: Dynamic texture loading from `.wad` archives and fallback to embedded BSP textures.
- **💡 Advanced Lightmaps**: High-fidelity map lighting using atlas-based lightmap textures with overbrightening and gamma correction.
- **🔍 Interactive Entity Inspector**: Raycasting entity selection with full key-value metadata inspection.
- **🔗 Entity Connections**: Visual lines illustrating `target` to `targetname` entity triggers and links.
- **🏗️ FGD Metadata**: Parse Half-Life FGD definitions for rich entity names, model references, and property descriptions.
- **🕹️ FPS Noclip Controls**: First-person controls with smooth acceleration, collision checking, and speed multipliers.
- **🛠️ Flexible Visual Toggles**: Wireframe overlays, map axes, AAATRIGGER transparency adjustments, texture filtering modes, and PVS visibility toggles.

---

## 📖 Detailed API Usage

### Viewer Configuration

The `BspViewer` class accepts options for custom styling and performance tuning:

```typescript
const viewer = new BspViewer({
    container: HTMLElement,           // HTML element container (Required)
    backgroundColor: 0x050505,         // Background clear color
    antialias: true,                   // WebGL antialiasing
    showAxes: true,                    // Display coordinate axes widget
    showWireframes: false,             // Render brush wireframes
    pvsEnabled: false,                 // Potentially Visible Set occlusion culling
    textureFiltering: true,            // Bilinear texture filtering (true = Linear, false = Nearest)
    lightmapFiltering: true,           // Lightmap smoothing
    aaaTriggerOpacity: 0.5,            // Opacity for trigger brushes (0.0 to 1.0)

    // Callbacks
    onProgress: (percent, msg) => {},  // Loading status updater
    onEntitySelect: (entity) => {},    // Entity pick listener
    onLockChange: (locked) => {},      // Pointer Lock status change listener
});
```

### Loading Map Assets

```javascript
// 1. Direct URLs fetch
await viewer.loadMapFromUrls('/maps/c1a2d.bsp', ['/textures/halflife.wad'], '/fgd/halflife.fgd');

// 2. Browser File Inputs / Drag & Drop
await viewer.loadMapFromFiles(bspFile, wadFileList, fgdFile);

// 3. Raw ArrayBuffer instances
await viewer.loadMap(bspArrayBuffer, [wadArrayBuffer1, wadArrayBuffer2]);
```

### Event System

```javascript
viewer.addEventListener('progress', ({ percent, message }) => {
    console.log(`[${percent}%] ${message}`);
});

viewer.addEventListener('entitySelect', (entity) => {
    if (entity) {
        console.log('Selected entity class:', entity.classname);
    }
});
```

---

## 🕹️ Controls

| Action | Key / Input |
| :--- | :--- |
| **Move** | `W` `A` `S` `D` |
| **Ascend / Descend** | `Space` / `Left Ctrl` |
| **Sprint** | Hold `Shift` |
| **Look Around** | `Mouse` (Click canvas to capture pointer) |
| **Select Entity** | `Left Click` on entity (While mouse locked) |
| **Unlock Mouse** | `Esc` |

---

## 🤝 Contributing

Contributions are welcome! Please check out [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## 📜 Changelog

Detailed release updates and changes can be found in the [CHANGELOG.md](CHANGELOG.md).

## 📄 License

This library's source code is licensed under the [MIT License](LICENSE).

## ⚖️ Asset Disclaimer & Copyright Notice

All sample game assets included in this repository and showcased in the live demo—including map files (`c1a2d.bsp`), texture archives (`halflife.wad`, `xeno.wad`, `decals.wad`), and game definitions (`halflife.fgd`)—are the intellectual property and copyright of **Valve Corporation** (Copyright © 1998–2026 Valve Corporation).

Half-Life is a registered trademark of Valve Corporation. These assets are bundled strictly for non-commercial educational, demonstration, and compatibility testing purposes. This project is fan-made and is not affiliated with, endorsed by, or sponsored by Valve Corporation.

## 👤 Author

**Gastón Urgorri**
- GitHub: [@urgorri](https://github.com/urgorri)
- Live Demo: [urgorri.github.io/goldsrc-bsp-viewer](https://urgorri.github.io/goldsrc-bsp-viewer/)
- Email: [urgorrigaston@gmail.com](mailto:urgorrigaston@gmail.com)

---
*Built for the Half-Life / GoldSrc modding community.*
