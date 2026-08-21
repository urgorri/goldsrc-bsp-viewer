### Description
Integrate a lightweight front-end UI framework (such as Tailwind CSS, Preact, Alpine.js, or DaisyUI) into the Vanilla GitHub Pages demo (`docs/`) to eliminate custom raw CSS boilerplate, standardize component styling, and improve responsiveness.

### Background & Context
Currently, `docs/index.html` and `docs/styles.css` maintain 440+ lines of custom CSS for modals, floating action buttons (FAB), toast notifications, settings panels, file inputs, and progress bars. Adopting a component utility or lightweight framework will make the demo UI more modular, accessible, and easier to extend when new viewer options are added.

### Proposed Changes
- **Framework Selection**: Adopt Tailwind CSS (via CDN/Vite bundle) or Alpine.js/DaisyUI in `docs/index.html`.
- **Component Refactoring**:
  - Refactor settings dialog (`#settings-modal`) into a standardized UI modal component.
  - Refactor toast notifications (`#toast-container`) into modern alert components.
  - Refactor file inputs and inspector properties into structured data tables or accordions.
- **Maintainability**: Remove redundant raw CSS declarations in `docs/styles.css`.

### Code References
- [`docs/index.html`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/docs/index.html)
- [`docs/styles.css`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/docs/styles.css)
- [`docs/app.js`](file:///E:/Dev/urgorri/bspviewer/goldsrc-bsp-viewer/docs/app.js)
