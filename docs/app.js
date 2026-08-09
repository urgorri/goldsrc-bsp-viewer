// Import the BspViewer from the built library
// We assume the user has built the library and dist folder is available at the root.
// For GitHub pages, we can just point to the relative path of the built file.
import { BspViewer } from '../dist/goldsrc-bsp-viewer.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const container = document.getElementById('viewer-container');
    const bspInput = document.getElementById('bsp-input');
    const wadInput = document.getElementById('wad-input');
    const loadBtn = document.getElementById('load-btn');

    const statusPanel = document.getElementById('status-panel');
    const statusText = document.getElementById('status-text');
    const progressBar = document.getElementById('progress-bar');
    const spinner = document.getElementById('loading-spinner');

    const inspectorPanel = document.getElementById('inspector-panel');
    const entityClassname = document.getElementById('entity-classname');
    const entityProperties = document.getElementById('entity-properties');

    // Initialize Viewer
    let viewer;
    try {
        viewer = new BspViewer({
            container: container,
            antialias: true,
            showAxes: true,
            backgroundColor: 0x050505
        });
    } catch (err) {
        console.error("Failed to initialize BspViewer:", err);
        alert("Failed to initialize the 3D viewer. Check console for details.");
        return;
    }

    // --- Event Listeners for the Viewer ---

    // Handle Progress Events
    viewer.addEventListener('progress', (data) => {
        // Show status panel if hidden
        if (statusPanel.style.display === 'none') {
            statusPanel.style.display = 'block';
        }

        statusText.innerText = data.message;
        progressBar.style.width = `${data.percent}%`;

        // Show/hide spinner based on completion
        if (data.percent < 100) {
            spinner.style.display = 'block';
        } else {
            spinner.style.display = 'none';
        }
    });

    // Handle Entity Selection Events
    viewer.addEventListener('entitySelect', (entity) => {
        if (!entity) {
            // Hide or clear inspector if selection is cleared (if viewer supports clearing)
            inspectorPanel.style.display = 'none';
            return;
        }

        // Show the panel
        inspectorPanel.style.display = 'flex';

        // Update classname
        entityClassname.innerText = entity.classname || 'Unknown Entity';

        // Clear old properties
        entityProperties.innerHTML = '';

        // Populate new properties
        for (const [key, value] of Object.entries(entity)) {
            const row = document.createElement('div');
            row.className = 'property-row';

            const keyEl = document.createElement('div');
            keyEl.className = 'property-key';
            keyEl.innerText = key;
            keyEl.title = key; // tooltip

            const valEl = document.createElement('div');
            valEl.className = 'property-value';
            valEl.innerText = value;
            valEl.title = value; // tooltip

            row.appendChild(keyEl);
            row.appendChild(valEl);
            entityProperties.appendChild(row);
        }
    });

    // --- File Loading Logic ---

    // Helper function to read a File object as an ArrayBuffer
    const readFileAsArrayBuffer = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsArrayBuffer(file);
        });
    };

    // Handle Load Button Click
    loadBtn.addEventListener('click', async () => {
        const bspFile = bspInput.files[0];

        if (!bspFile) {
            alert("Please select a .bsp file to load.");
            return;
        }

        // Disable button during load
        loadBtn.disabled = true;
        loadBtn.innerText = 'Loading...';

        // Reset UI
        inspectorPanel.style.display = 'none';
        statusPanel.style.display = 'block';
        statusText.innerText = 'Reading files...';
        progressBar.style.width = '0%';
        spinner.style.display = 'block';

        try {
            // 1. Read the BSP file
            const bspBuffer = await readFileAsArrayBuffer(bspFile);

            // 2. Read the WAD files (if any)
            const wadBuffers = [];
            if (wadInput.files && wadInput.files.length > 0) {
                for (let i = 0; i < wadInput.files.length; i++) {
                    const wadBuffer = await readFileAsArrayBuffer(wadInput.files[i]);
                    wadBuffers.push(wadBuffer);
                }
            }

            // 3. Pass buffers to the viewer
            statusText.innerText = 'Parsing map data...';
            await viewer.loadMap(bspBuffer, wadBuffers);

            statusText.innerText = 'Map loaded successfully. Click canvas to start.';
            progressBar.style.width = '100%';

        } catch (err) {
            console.error("Error loading map:", err);
            statusText.innerText = `Error: ${err.message}`;
            progressBar.style.width = '0%';
            progressBar.style.backgroundColor = 'red';
        } finally {
            // Re-enable button
            loadBtn.disabled = false;
            loadBtn.innerText = 'Load Map';
            spinner.style.display = 'none';

            // reset progress bar color after a delay if it was error
            setTimeout(() => {
                 progressBar.style.backgroundColor = 'var(--success-color)';
            }, 3000);
        }
    });

    // --- Window Resize Handling ---
    // The BspViewer uses ResizeObserver internally on the container,
    // so explicit window resize event listener isn't strictly necessary for the viewer itself,
    // but it's good practice to ensure the container dimensions are correct if needed.
    // The CSS absolute positioning handles the container size perfectly.
});