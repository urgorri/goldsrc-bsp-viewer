// Import the BspViewer from the built library
// We assume the user has built the library and dist folder is available at the root.
// For GitHub pages, we can just point to the relative path of the built file.
import { BspViewer } from './dist/goldsrc-bsp-viewer.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const container = document.getElementById('viewer-container');
    const bspInput = document.getElementById('bsp-input');
    const wadInput = document.getElementById('wad-input');
    const fgdInput = document.getElementById('fgd-input');
    const loadBtn = document.getElementById('load-btn');

    const toastContainer = document.getElementById('toast-container');
    const settingsFab = document.getElementById('settings-fab');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');

    const inspectorPanel = document.getElementById('inspector-panel');
    const entityClassname = document.getElementById('entity-classname');
    const entityProperties = document.getElementById('entity-properties');

    // Settings Panel Elements
    const texFilterSelect = document.getElementById('texture-filtering');
    const lightmapFilterCheck = document.getElementById('lightmap-filtering');
    const showBrushCheck = document.getElementById('show-brush-entities');
    const showWireframesCheck = document.getElementById('show-wireframes');
    const showAxesCheck = document.getElementById('show-axes');
    const showCrosshairCheck = document.getElementById('show-crosshair');
    const autoPointerLockCheck = document.getElementById('auto-pointer-lock');
    const opacitySlider = document.getElementById('aaa-trigger-opacity');
    const opacityValSpan = document.getElementById('aaa-trigger-opacity-val');

    // Initialize Viewer
    let viewer;
    try {
        viewer = new BspViewer({
            container: container,
            antialias: true,
            showAxes: showAxesCheck.checked,
            backgroundColor: 0x050505,
            textureFiltering: texFilterSelect.value === 'true',
            lightmapFiltering: lightmapFilterCheck.checked,
            showBrushEntities: showBrushCheck.checked,
            showBrushWireframes: showWireframesCheck.checked,
            showCrosshair: showCrosshairCheck.checked,
            autoPointerLock: autoPointerLockCheck.checked,
            aaaTriggerOpacity: parseFloat(opacitySlider.value)
        });
    } catch (err) {
        console.error("Failed to initialize BspViewer:", err);
        alert("Failed to initialize the 3D viewer. Check console for details.");
        return;
    }

    // --- Toast Notification Manager ---

    let currentLoadingToast = null;

    const showToast = (title, message, isError = false, progress = -1) => {
        const toast = document.createElement('div');
        toast.className = 'toast';

        const header = document.createElement('div');
        header.className = 'toast-header';

        const titleEl = document.createElement('h3');
        titleEl.innerText = title;
        header.appendChild(titleEl);

        if (progress >= 0 && progress < 100) {
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            header.appendChild(spinner);
        }

        const textEl = document.createElement('div');
        textEl.className = 'toast-text';
        textEl.innerText = message;

        toast.appendChild(header);
        toast.appendChild(textEl);

        let progressContainer, progressBar;
        if (progress >= 0) {
            progressContainer = document.createElement('div');
            progressContainer.className = 'toast-progress-container';

            progressBar = document.createElement('div');
            progressBar.className = 'toast-progress-bar';
            if (isError) progressBar.classList.add('error');
            progressBar.style.width = `${progress}%`;

            progressContainer.appendChild(progressBar);
            toast.appendChild(progressContainer);
        }

        toastContainer.appendChild(toast);

        // Auto dismiss if it's an error or completion toast (progress 100 or -1)
        if (isError || progress === 100 || progress === -1) {
            if (progress === 100 && progressBar) {
                progressBar.classList.add('success');
            }
            setTimeout(() => {
                toast.classList.add('fade-out');
                setTimeout(() => toast.remove(), 300); // Wait for fade-out animation
            }, 3000);
        }

        return {
            element: toast,
            update: (newMessage, newProgress, newIsError = false) => {
                textEl.innerText = newMessage;
                if (progressBar) {
                    progressBar.style.width = `${newProgress}%`;
                    if (newIsError) {
                        progressBar.classList.add('error');
                        progressBar.classList.remove('success');
                    } else if (newProgress === 100) {
                        progressBar.classList.add('success');
                        progressBar.classList.remove('error');
                    }
                }

                // Remove spinner on completion/error
                if (newProgress === 100 || newIsError) {
                    const spinner = header.querySelector('.spinner');
                    if (spinner) spinner.remove();

                    // Auto dismiss
                    setTimeout(() => {
                        toast.classList.add('fade-out');
                        setTimeout(() => toast.remove(), 300);
                    }, 3000);
                }
            }
        };
    };

    // --- Event Listeners for the Viewer ---

    // Handle Progress Events
    viewer.addEventListener('progress', (data) => {
        if (!currentLoadingToast) {
            currentLoadingToast = showToast('Status', data.message, false, data.percent);
        } else {
            currentLoadingToast.update(data.message, data.percent);
            if (data.percent === 100) {
                currentLoadingToast = null; // Clear reference once done
            }
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

    // --- Settings UI Event Listeners ---

    settingsFab.addEventListener('click', () => {
        settingsModal.showModal();
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.close();
    });

    // Close modal when clicking outside
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.close();
        }
    });

    texFilterSelect.addEventListener('change', (e) => {
        viewer.setOptions({ textureFiltering: e.target.value === 'true' });
    });

    lightmapFilterCheck.addEventListener('change', (e) => {
        viewer.setOptions({ lightmapFiltering: e.target.checked });
    });

    showBrushCheck.addEventListener('change', (e) => {
        viewer.setOptions({ showBrushEntities: e.target.checked });
    });

    showWireframesCheck.addEventListener('change', (e) => {
        viewer.setOptions({ showBrushWireframes: e.target.checked });
    });

    showAxesCheck.addEventListener('change', (e) => {
        viewer.setOptions({ showAxes: e.target.checked });
    });

    showCrosshairCheck.addEventListener('change', (e) => {
        viewer.setOptions({ showCrosshair: e.target.checked });
    });

    autoPointerLockCheck.addEventListener('change', (e) => {
        viewer.setOptions({ autoPointerLock: e.target.checked });
    });

    opacitySlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        opacityValSpan.innerText = val.toFixed(1);
        viewer.setOptions({ aaaTriggerOpacity: val });
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

    // Helper function to read a File object as Text
    const readFileAsText = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsText(file);
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

        if (currentLoadingToast) {
            currentLoadingToast.element.remove();
        }
        currentLoadingToast = showToast('Status', 'Reading files...', false, 0);

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

            // 3. Read the FGD file (if any)
            let fgdText = undefined;
            if (fgdInput.files && fgdInput.files.length > 0) {
                fgdText = await readFileAsText(fgdInput.files[0]);
            }

            // 4. Pass buffers and text to the viewer
            currentLoadingToast.update('Parsing map data...', 50);
            await viewer.loadMap(bspBuffer, wadBuffers, fgdText);

            // Let the internal progress handler finish the toast, or if it doesn't emit 100%:
            if (currentLoadingToast) {
                currentLoadingToast.update('Map loaded successfully. Click canvas to start.', 100);
                currentLoadingToast = null;
            }

        } catch (err) {
            console.error("Error loading map:", err);
            if (currentLoadingToast) {
                currentLoadingToast.update(`Error: ${err.message}`, 100, true);
                currentLoadingToast = null;
            } else {
                showToast('Error', err.message, true, 100);
            }
        } finally {
            // Re-enable button
            loadBtn.disabled = false;
            loadBtn.innerText = 'Load Map';
        }
    });

    // --- Pre-load default map resources ---
    const preloadDefaultFiles = async () => {
        try {
            // Fetch default resources
            const bspResponse = await fetch('./resources/c1a2d.bsp');
            const decalsResponse = await fetch('./resources/decals.wad');
            const halflifeResponse = await fetch('./resources/halflife.wad');
            const xenoResponse = await fetch('./resources/xeno.wad');

            if (!bspResponse.ok || !decalsResponse.ok || !halflifeResponse.ok || !xenoResponse.ok) {
                console.warn("Could not fetch one or more default resources. Skipping preload.");
                return;
            }

            const bspBlob = await bspResponse.blob();
            const decalsBlob = await decalsResponse.blob();
            const halflifeBlob = await halflifeResponse.blob();
            const xenoBlob = await xenoResponse.blob();

            // Create File objects
            const bspFile = new File([bspBlob], 'c1a2d.bsp', { type: '' });
            const decalsFile = new File([decalsBlob], 'decals.wad', { type: '' });
            const halflifeFile = new File([halflifeBlob], 'halflife.wad', { type: '' });
            const xenoFile = new File([xenoBlob], 'xeno.wad', { type: '' });

            // Assign to inputs using DataTransfer
            const bspDataTransfer = new DataTransfer();
            bspDataTransfer.items.add(bspFile);
            bspInput.files = bspDataTransfer.files;

            const wadDataTransfer = new DataTransfer();
            wadDataTransfer.items.add(decalsFile);
            wadDataTransfer.items.add(halflifeFile);
            wadDataTransfer.items.add(xenoFile);
            wadInput.files = wadDataTransfer.files;

            // Trigger load
            loadBtn.click();
        } catch (err) {
            console.error("Error preloading default files:", err);
        }
    };

    // Call preload on initialization
    preloadDefaultFiles();

    // --- Window Resize Handling ---
    // The BspViewer uses ResizeObserver internally on the container,
    // so explicit window resize event listener isn't strictly necessary for the viewer itself,
    // but it's good practice to ensure the container dimensions are correct if needed.
    // The CSS absolute positioning handles the container size perfectly.
});
