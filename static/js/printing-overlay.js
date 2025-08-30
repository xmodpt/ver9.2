/**
 * Printing Overlay with External Camera Stream
 * Handles the full-screen printing interface with external camera feed
 */

// Overlay state management
let overlayState = {
    visible: false,
    cameraVisible: true,
    cameraMinimized: false,
    printData: null
};

// Camera stream management
let cameraStreamImg = null;

// Initialize overlay system
document.addEventListener('DOMContentLoaded', function() {
    initializePrintingOverlay();
});

function initializePrintingOverlay() {
    console.log('📺 Initializing printing overlay with external camera stream...');
    
    // Setup camera stream elements
    setupCameraStream();
    
    // Setup overlay event handlers
    setupOverlayEventHandlers();
    
    console.log('✅ Printing overlay initialized');
}

function setupCameraStream() {
    const cameraContainer = document.getElementById('overlayCameraContainer');
    if (!cameraContainer) {
        console.warn('Camera container not found in overlay');
        return;
    }
    
    // Get camera stream image element
    cameraStreamImg = document.getElementById('overlayCameraStream');
    if (cameraStreamImg) {
        // Setup error handling
        cameraStreamImg.onerror = handleCameraStreamError;
        cameraStreamImg.onload = handleCameraStreamSuccess;
    }
    
    // Add camera controls
    addCameraOverlayControls();
}

function addCameraOverlayControls() {
    const cameraStream = document.querySelector('.overlay-camera-stream');
    if (!cameraStream || document.querySelector('.camera-overlay-controls')) {
        return; // Already exists
    }
    
    const controls = document.createElement('div');
    controls.className = 'camera-overlay-controls';
    controls.innerHTML = `
        <button class="camera-overlay-btn" onclick="refreshCameraStream()" title="Refresh Stream">
            🔄
        </button>
        <button class="camera-overlay-btn" onclick="toggleCameraFullscreen()" title="Fullscreen">
            🔍
        </button>
    `;
    
    cameraStream.appendChild(controls);
}

function setupOverlayEventHandlers() {
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (overlayState.visible) {
            switch(e.key) {
                case 'Escape':
                    e.preventDefault();
                    closePrintingOverlay();
                    break;
                case 'c':
                case 'C':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        toggleOverlayCamera();
                    }
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    toggleCameraFullscreen();
                    break;
                case ' ':
                    e.preventDefault();
                    if (typeof pausePrint === 'function') {
                        pausePrint();
                    }
                    break;
            }
        }
    });
}

// Camera control functions
function toggleOverlayCamera() {
    if (overlayState.cameraVisible) {
        hideOverlayCamera();
    } else {
        showOverlayCamera();
    }
}

function showOverlayCamera() {
    const cameraContainer = document.getElementById('overlayCameraContainer');
    if (cameraContainer) {
        cameraContainer.style.display = 'block';
        cameraContainer.classList.remove('hidden');
        overlayState.cameraVisible = true;
        
        // Update camera button state
        updateCameraButtonState(true);
    }
}

function hideOverlayCamera() {
    const cameraContainer = document.getElementById('overlayCameraContainer');
    if (cameraContainer) {
        cameraContainer.style.display = 'none';
        cameraContainer.classList.add('hidden');
        overlayState.cameraVisible = false;
        
        // Update camera button state
        updateCameraButtonState(false);
    }
}

function minimizeOverlayCamera() {
    const cameraContainer = document.getElementById('overlayCameraContainer');
    if (cameraContainer) {
        cameraContainer.classList.toggle('minimized');
        overlayState.cameraMinimized = cameraContainer.classList.contains('minimized');
        
        const toggleIcon = document.getElementById('cameraToggleIcon');
        if (toggleIcon) {
            toggleIcon.className = overlayState.cameraMinimized ? 'fas fa-eye' : 'fas fa-eye-slash';
        }
    }
}

function updateCameraButtonState(active) {
    const cameraBtn = document.querySelector('.printing-btn.camera-btn');
    if (cameraBtn) {
        if (active) {
            cameraBtn.classList.add('active');
            cameraBtn.title = 'Hide Camera (Ctrl+C)';
        } else {
            cameraBtn.classList.remove('active');
            cameraBtn.title = 'Show Camera (Ctrl+C)';
        }
    }
}

function refreshCameraStream() {
    console.log('📹 Refreshing camera stream');
    if (cameraStreamImg) {
        cameraStreamImg.src = cameraStreamImg.src.split('&t=')[0] + '&t=' + Date.now();
    }
    
    const overlayImg = document.getElementById('overlayCameraStream');
    if (overlayImg) {
        overlayImg.src = overlayImg.src.split('&t=')[0] + '&t=' + Date.now();
    }
}

function toggleCameraFullscreen() {
    if (!cameraStreamImg) {
        if (typeof showAlert === 'function') {
            showAlert('Camera not available for fullscreen', 'warning');
        }
        return;
    }
    
    try {
        if (cameraStreamImg.requestFullscreen) {
            cameraStreamImg.requestFullscreen();
        } else if (cameraStreamImg.webkitRequestFullscreen) {
            cameraStreamImg.webkitRequestFullscreen();
        } else if (cameraStreamImg.mozRequestFullScreen) {
            cameraStreamImg.mozRequestFullScreen();
        } else if (cameraStreamImg.msRequestFullscreen) {
            cameraStreamImg.msRequestFullscreen();
        } else {
            throw new Error('Fullscreen not supported');
        }
        
    } catch (error) {
        if (typeof showAlert === 'function') {
            showAlert('Fullscreen not supported', 'warning');
        }
    }
}

// Camera error handling
function handleCameraStreamError() {
    console.warn('📹 Camera stream error detected');
    
    const cameraContainer = document.getElementById('overlayCameraContainer');
    if (cameraContainer) {
        cameraContainer.classList.add('camera-stream-error');
        setTimeout(() => {
            cameraContainer.classList.remove('camera-stream-error');
        }, 1000);
    }
}

function handleCameraStreamSuccess() {
    console.log('📹 Camera stream connected successfully');
    
    const cameraContainer = document.getElementById('overlayCameraContainer');
    if (cameraContainer) {
        cameraContainer.classList.remove('camera-stream-error', 'camera-stream-connecting');
    }
}

// Main overlay functions
function showPrintingOverlay(printData) {
    console.log('📺 Showing printing overlay with external camera stream');
    
    const overlay = document.getElementById('printingOverlay');
    if (!overlay) {
        console.error('Printing overlay element not found');
        return;
    }
    
    // Store print data
    overlayState.printData = printData;
    overlayState.visible = true;
    
    // Show overlay
    overlay.classList.add('active');
    
    // Update print information
    updatePrintingDisplay(printData);
    
    // Show camera by default
    showOverlayCamera();
    
    // Start monitoring print progress
    startPrintProgressMonitoring();
}

function closePrintingOverlay() {
    console.log('📺 Closing printing overlay');
    
    const overlay = document.getElementById('printingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
    
    overlayState.visible = false;
    overlayState.printData = null;
    
    // Stop monitoring
    stopPrintProgressMonitoring();
    
    // Hide camera
    hideOverlayCamera();
}

function updatePrintingDisplay(data) {
    if (!data) return;
    
    // Update file name
    const fileNameElement = document.getElementById('printingFileName');
    if (fileNameElement) {
        fileNameElement.textContent = data.selected_file || 'Print Job';
    }
    
    // Update progress
    const progressElement = document.getElementById('printingProgress');
    if (progressElement && data.print_status) {
        const progress = data.print_status.progress_percent || 0;
        progressElement.textContent = `${progress.toFixed(1)}%`;
    }
    
    // Update Z position
    const zPosElement = document.getElementById('printingZPos');
    if (zPosElement) {
        zPosElement.textContent = `${data.z_position?.toFixed(2) || '0.00'} mm`;
    }
    
    // Update data progress
    const bytesElement = document.getElementById('printingBytes');
    if (bytesElement && data.print_status) {
        const current = data.print_status.current_byte || 0;
        const total = data.print_status.total_bytes || 1;
        const dataProgress = total > 0 ? ((current / total) * 100).toFixed(1) : 0;
        bytesElement.textContent = `${dataProgress}%`;
    }
    
    // Update status
    const statusElement = document.getElementById('printingStatus');
    if (statusElement && data.print_status) {
        statusElement.textContent = data.print_status.state || 'Unknown';
    }
    
    // Update pause/resume button
    updatePauseResumeButton(data.print_status?.state);
}

function updatePauseResumeButton(printState) {
    const pauseBtn = document.getElementById('printingPauseBtn');
    if (!pauseBtn) return;
    
    if (printState === 'PAUSED') {
        pauseBtn.innerHTML = `
            <div class="printing-btn-icon">▶️</div>
            <div class="printing-btn-label">Resume</div>
        `;
        pauseBtn.onclick = function() {
            if (typeof resumePrint === 'function') {
                resumePrint();
            }
        };
        pauseBtn.className = 'printing-btn green';
    } else {
        pauseBtn.innerHTML = `
            <div class="printing-btn-icon">⏸️</div>
            <div class="printing-btn-label">Pause</div>
        `;
        pauseBtn.onclick = function() {
            if (typeof pausePrint === 'function') {
                pausePrint();
            }
        };
        pauseBtn.className = 'printing-btn orange';
    }
}

// Progress monitoring
let printProgressInterval = null;

function startPrintProgressMonitoring() {
    if (printProgressInterval) {
        clearInterval(printProgressInterval);
    }
    
    printProgressInterval = setInterval(async () => {
        if (!overlayState.visible) return;
        
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            updatePrintingDisplay(data);
            
            // Check if print finished
            const printState = data.print_status?.state;
            if (printState === 'FINISHED' || printState === 'IDLE') {
                // Auto-close overlay after print finishes (optional)
                // setTimeout(() => closePrintingOverlay(), 5000);
            }
            
        } catch (error) {
            console.debug('Print progress update failed:', error);
        }
    }, 2000); // Update every 2 seconds
}

function stopPrintProgressMonitoring() {
    if (printProgressInterval) {
        clearInterval(printProgressInterval);
        printProgressInterval = null;
    }
}

// Global function exports
window.showPrintingOverlay = showPrintingOverlay;
window.closePrintingOverlay = closePrintingOverlay;
window.toggleOverlayCamera = toggleOverlayCamera;
window.showOverlayCamera = showOverlayCamera;
window.hideOverlayCamera = hideOverlayCamera;
window.minimizeOverlayCamera = minimizeOverlayCamera;
window.refreshCameraStream = refreshCameraStream;
window.toggleCameraFullscreen = toggleCameraFullscreen;
window.handleCameraStreamError = handleCameraStreamError;
window.handleCameraStreamSuccess = handleCameraStreamSuccess;

// Backward compatibility
window.handleOverlayCameraError = handleCameraStreamError;

console.log('✅ Printing overlay with external camera stream loaded');