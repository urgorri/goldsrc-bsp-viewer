# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-08-20

### Fixed
- Fixed `showCrosshair` option not applying on initial `BspViewer` constructor initialization.
- Added full-screen loading spinner overlay and default `halflife.fgd` preloading to GitHub Pages showcase demo.

## [1.1.0] - 2026-08-20

### Added
- Support for parsing and rendering embedded BSP textures when WAD files are not provided or incomplete.
- Exported low-level engine modules (`EntityRenderer`, `PvsManager`, `convertVector`, `generateFaceGeometry`) from package entrypoint.

### Fixed
- Fixed `ViewerCanvas` React component re-instantiating `BspViewer` and destroying canvas/state when option props or callbacks changed.
- Fixed `clearConnections` in `MapRenderer` disposing shared connection line materials (`yellow`/`green`).
- Made `wadBuffers` parameter optional in `BspViewer.loadMap`.

## [1.0.0] - 2026-05-31

### Added
- Initial release of the GoldSrc BSP Viewer.
- Support for GoldSrc (Half-Life) BSP v30 map parsing.
- WAD3 texture loading.
- Real-time Lightmap rendering with atlas support.
- Interactive Entity Inspector.
- FGD metadata integration.
- Standard FPS-style "Noclip" controls.
- Entity connection visualization (target/targetname).
- Toggleable brush wireframes and map axes.
- Support for AAA-trigger transparency.
- Adjustable texture and lightmap filtering.
- PVS-based visibility (hidden/disabled by default).
- Repository documentation: LICENSE, README, CONTRIBUTING, CHANGELOG.
