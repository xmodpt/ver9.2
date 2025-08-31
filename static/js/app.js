/**
 * Main Application JavaScript - WITH EXTERNAL CAMERA STREAM
 * Updated to work with external camera stream
 */

// Global state
let currentPrintStatus = 'IDLE';
let updateInterval = null;
let maxConsoleLines = 50;
let printingOverlayVisible = false;
let stopRequestInProgress = false;
let forcedClosed = false;

// Settings state (loaded from backend)
let appSettings = {
    showPrintingOverlay: true,
    enableCamera: true,
    autoConnect: false,
    enableNotifications: true,
    updateInterval: 3,
    maxConsoleLines: 50,
    cameraStreamUrl: '', // Will be dynamically loaded from /api/camera/config
    fullscreenWebcam: true
};

// ============= SESSION-BASED OVERLAY STATE MANAGEMENT =============

function getCurrentPrintSession() {
    return localStorage.getItem('currentPrintSession') || '';
}

function generatePrintSession() {
    return Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
}

function setCurrentPrintSession(sessionId) {
    localStorage.setItem('currentPrintSession', sessionId);
    console.log('📋 Print session set:', sessionId);
}

function isOverlayDisabledForCurrentPrint() {
    const disabledSession = localStorage.getItem('overlayDisabledForSession');
    const currentSession = getCurrentPrintSession();
    
    if (!currentSession) return false;
    
    const isDisabled = disabledSession === currentSession;
    if (isDisabled) {
        console.log('📱 Overlay disabled for session:', currentSession);
    }
    return isDisabled;
}

function disableOverlayForCurrentPrint() {
    const currentSession = getCurrentPrintSession();
    if (currentSession) {
        localStorage.setItem('overlayDisabledForSession', currentSession);
        console.log('🚫 Overlay disabled for print session:', currentSession);
    }
}

function clearOverlayDisableAndSession() {
    localStorage.removeItem('overlayDisabledForSession');
    localStorage.removeItem('currentPrintSession');
    forcedClosed = false;
    stopRequestInProgress = false;
    console.log('🧹 Overlay session cleared - ready for new print');
}

function isNewPrintStarting(newStatus, oldStatus, selectedFile) {
    const wasIdle = !oldStatus || oldStatus === 'IDLE' || oldStatus === 'FINISHED' || oldStatus === 'ERROR';
    const isNowPrinting = newStatus === 'PRINTING';
    
    if (wasIdle && isNowPrinting && selectedFile) {
        const currentSession = getCurrentPrintSession();
        
        if (!currentSession || wasIdle) {
            const newSession = generatePrintSession();
            setCurrentPrintSession(newSession);
            localStorage.removeItem('overlayDisabledForSession');
            console.log('🆕 New print session started:', newSession);
            return true;
        }
    }
    
    return false;
}

function isPrintActuallyFinished(status, selectedFile) {
    const isIdleState = status.state === 'IDLE' || status.state === 'FINISHED';
    const noFileSelected = !selectedFile || selectedFile === '';
    const isComplete = status.progress_percent >= 100;
    
    return isIdleState && (noFileSelected || isComplete);
}

async function forceResetPrinterState() {
    try {
        const response = await fetch('/api/force_reset_printer', { method: 'POST' });
        if (response.ok) {
            console.log('🔄 Printer state force reset');
        }
    } catch (error) {
        console.warn('Failed to force reset printer state:', error);
    }
}

// Function to update camera URLs from config
function updateCameraUrlsFromConfig() {
    if (window.cameraConfig) {
        appConfig.cameraStreamUrl = window.cameraConfig.streamUrl;
        console.log('📹 Camera URLs updated from config:', window.cameraConfig.streamUrl);
    }
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Starting main application with external camera stream...');
    
    // Update camera URLs if config is already loaded
    updateCameraUrlsFromConfig();
    
    // Listen for camera config updates
    window.addEventListener('cameraConfigLoaded', updateCameraUrlsFromConfig);
    
    // Check and clean up stale sessions on page load
    const currentSession = getCurrentPrintSession();
    if (currentSession) {
        console.log('📱 Page loaded with existing session:', currentSession);
        
        setTimeout(() => {
            if (currentPrintStatus === 'IDLE' || currentPrintStatus === 'FINISHED' || currentPrintStatus === 'ERROR') {
                console.log('🧹 Printer not printing - clearing stale session');
                clearOverlayDisableAndSession();
                forceResetPrinterState();
            }
        }, 3000);
    }
    
    // Load settings first, then initialize
    loadAppSettings().then(() => {
        initializeApp();
        startUpdateCycle();
    });
    
    console.log('✅ Main application initialized with external camera stream');
});

// Load application settings
async function loadAppSettings() {
    try {
        const response = await fetch('/api/settings');
        if (response.ok) {
            const settings = await response.json();
            appSettings = { ...appSettings, ...settings };
            console.log('📋 Settings loaded:', appSettings);
            
                // Camera settings handled by simple-camera.js
        }
    } catch (error) {
        console.log('ℹ️ Using default settings');
    }
}

// Initialize core app functionality
function initializeApp() {
    setupFileUpload();
    setupDragAndDrop();
    setupEventHandlers();
    applySettings();
    
    // Initial status update
    updateStatus();
    checkUSB();
    refreshFiles();
}

// Apply settings to the app
function applySettings() {
    maxConsoleLines = appSettings.maxConsoleLines || 50;
    
    // Apply camera visibility
    updateCameraVisibility();
    
    console.log('⚙️ Settings applied');
}

function updateCameraVisibility() {
    const cameraCard = document.getElementById('cameraCard');
    if (cameraCard) {
        if (appSettings.enableCamera) {
            cameraCard.style.display = 'block';
        } else {
            cameraCard.style.display = 'none';
        }
    }
}

// Setup file upload functionality
function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    
    if (uploadArea && fileInput) {
        uploadArea.onclick = () => fileInput.click();
        fileInput.onchange = (e) => handleFiles(e.target.files);
    }
}

// Setup drag and drop
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    if (uploadArea) {
        uploadArea.ondragover = (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        };
        
        uploadArea.ondragleave = (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        };
        
        uploadArea.ondrop = (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        };
    }
}

// Setup event handlers
function setupEventHandlers() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            openSettings();
        }
        if (e.key === 'Escape') {
            forceClosePrintingView();
        }
    });
}

// Start update cycle
function startUpdateCycle() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    const intervalSeconds = appSettings.updateInterval || 3;
    updateInterval = setInterval(() => {
        updateStatus();
        checkUSB();
    }, intervalSeconds * 1000);
}

// ============= BUTTON STATE MANAGEMENT =============

function updateButtonStates(isConnected, printState) {
    const buttons = {
        connect: document.getElementById('connectBtn'),
        disconnect: document.getElementById('disconnectBtn'),
        start: document.getElementById('startBtn'),
        pause: document.getElementById('pauseBtn'),
        resume: document.getElementById('resumeBtn'),
        stop: document.getElementById('stopBtn')
    };
    
    if (buttons.connect) buttons.connect.disabled = isConnected;
    if (buttons.disconnect) buttons.disconnect.disabled = !isConnected;
    
    if (!isConnected) {
        ['start', 'pause', 'resume', 'stop'].forEach(btn => {
            if (buttons[btn]) buttons[btn].disabled = true;
        });
        return;
    }
    
    switch (printState) {
        case 'IDLE':
        case 'FINISHED':
            if (buttons.start) buttons.start.disabled = false;
            if (buttons.pause) buttons.pause.disabled = true;
            if (buttons.resume) buttons.resume.disabled = true;
            if (buttons.stop) buttons.stop.disabled = true; // Only disable when truly idle
            break;
            
        case 'PRINTING':
            if (buttons.start) buttons.start.disabled = true;
            if (buttons.pause) buttons.pause.disabled = false;
            if (buttons.resume) buttons.resume.disabled = true;
            // CRITICAL FIX: Keep stop button ENABLED during printing
            if (buttons.stop) {
                buttons.stop.disabled = false;
                buttons.stop.style.cursor = 'pointer';
                buttons.stop.style.pointerEvents = 'auto';
            }
            break;
            
        case 'PAUSED':
            if (buttons.start) buttons.start.disabled = true;
            if (buttons.pause) buttons.pause.disabled = true;
            if (buttons.resume) buttons.resume.disabled = false;
            // CRITICAL FIX: Keep stop button ENABLED when paused
            if (buttons.stop) {
                buttons.stop.disabled = false;
                buttons.stop.style.cursor = 'pointer';
                buttons.stop.style.pointerEvents = 'auto';
            }
            break;
            
        default:
            if (buttons.start) buttons.start.disabled = true;
            if (buttons.pause) buttons.pause.disabled = true;
            if (buttons.resume) buttons.resume.disabled = true;
            // Keep stop enabled for safety
            if (buttons.stop) {
                buttons.stop.disabled = false;
                buttons.stop.style.cursor = 'pointer';
                buttons.stop.style.pointerEvents = 'auto';
            }
            break;
    }
}

    // ============= PRINTING VIEW MANAGEMENT (Updated for External Camera Stream) =============

function showPrintingView(statusData) {
    if (!appSettings.showPrintingOverlay) {
        console.log('📺 Printing overlay disabled in settings');
        return;
    }
    
    if (isOverlayDisabledForCurrentPrint()) {
        console.log('📺 Overlay disabled for current print session');
        return;
    }
    
    if (stopRequestInProgress || forcedClosed) {
        console.log('📺 Overlay blocked by temporary flags');
        return;
    }
    
    // Use the new integrated overlay system
    if (typeof showPrintingOverlay === 'function') {
        if (!printingOverlayVisible) {
            showPrintingOverlay(statusData);
            printingOverlayVisible = true;
            console.log('📺 Printing overlay shown with external camera stream');
        } else {
            // Update existing overlay
            if (typeof updatePrintingDisplay === 'function') {
                updatePrintingDisplay(statusData);
            }
        }
    } else {
        console.warn('Printing overlay system not available');
    }
}

function closePrintingView() {
    if (typeof closePrintingOverlay === 'function') {
        if (currentPrintStatus === 'IDLE' || currentPrintStatus === 'FINISHED') {
            closePrintingOverlay();
            printingOverlayVisible = false;
            console.log('📺 Integrated printing overlay closed - print finished');
        }
    }
    // Remove any line that says: closePrintingView();
}

function forceClosePrintingView() {
    if (typeof closePrintingOverlay === 'function') {
        closePrintingOverlay();
        printingOverlayVisible = false;
        
        disableOverlayForCurrentPrint();
        
        console.log('📺 Integrated printing overlay manually closed for current session');
        
        if (typeof showAlert === 'function') {
            showAlert('Overlay closed for this print session. Will return for next print.', 'info');
        }
    }
}

// ============= CORE FUNCTIONALITY =============

async function handleFiles(files) {
    if (files.length === 0) return;
    
    const formData = new FormData();
    for (let file of files) {
        formData.append('files', file);
    }
    
    try {
        // Show upload progress
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="upload-progress">
                    <div class="upload-icon">📤</div>
                    <div class="upload-text">Uploading ${files.length} file(s)...</div>
                    <div class="upload-hint">Please wait...</div>
                </div>
            `;
        }
        
        addConsoleMessage(`Starting upload of ${files.length} file(s)...`, 'info');
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            const successMessage = `Successfully uploaded ${result.total_uploaded} file(s)`;
            showAlert(successMessage, 'success');
            addConsoleMessage(successMessage, 'success');
            
            // Show individual file uploads
            if (result.uploaded && result.uploaded.length > 0) {
                result.uploaded.forEach(file => {
                    addConsoleMessage(`✓ Uploaded: ${file.name}`, 'success');
                });
            }
            
            // Show any errors
            if (result.errors && result.errors.length > 0) {
                result.errors.forEach(error => {
                    addConsoleMessage(`✗ Error: ${error.filename} - ${error.error}`, 'error');
                });
            }
            
            // Refresh file list to show new files
            await refreshFiles();
        } else {
            showAlert('Upload failed', 'error');
            addConsoleMessage('Upload failed', 'error');
        }
        
    } catch (error) {
        showAlert(`Upload error: ${error.message}`, 'error');
        addConsoleMessage(`Upload error: ${error.message}`, 'error');
    } finally {
        // Restore upload area
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <input type="file" id="fileInput" multiple accept=".ctb,.cbddlp,.pwmx,.pwmo,.pwms,.pws,.pw0,.pwx" style="display: none;">
                <div class="upload-icon">📎</div>
                <div class="upload-text">Click or drop files here</div>
                <div class="upload-hint">CTB, CBDDLP, PWMX, PWS formats</div>
            `;
            // Re-setup the file input
            setupFileUpload();
        }
    }
}

// Enhanced status update with session-based overlay management
async function updateStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        // Update connection status
        const connectionElement = document.getElementById('connectionStatus');
        if (connectionElement) {
            connectionElement.textContent = data.connected ? 'Connected' : 'Disconnected';
            connectionElement.className = data.connected ? 'status-value status-connected' : 'status-value status-disconnected';
        }
        
        const newPrintStatus = data.print_status?.state || 'IDLE';
        const oldPrintStatus = currentPrintStatus;
        const selectedFile = data.selected_file || '';
        
        // Check if print actually finished and clean up session
        if (isPrintActuallyFinished(data.print_status || {}, selectedFile)) {
            const hadSession = getCurrentPrintSession() !== '';
            if (hadSession) {
                clearOverlayDisableAndSession();
                console.log('Print finished - session cleared');
            }
        }
        
        // Check if this is a new print starting
        if (isNewPrintStarting(newPrintStatus, oldPrintStatus, selectedFile)) {
            console.log('New print detected - overlay enabled');
        }
        
        // Update print status display
        const printStatusElement = document.getElementById('printStatus');
        if (printStatusElement) {
            printStatusElement.textContent = newPrintStatus;
            
            const isActivePrint = newPrintStatus === 'PRINTING' || newPrintStatus === 'PAUSED';
            const hasValidSession = getCurrentPrintSession() !== '';
            
            if (isActivePrint && hasValidSession && appSettings.showPrintingOverlay && !isOverlayDisabledForCurrentPrint()) {
                printStatusElement.className = 'status-value status-printing';
                
                if (!stopRequestInProgress && !forcedClosed) {
                    showPrintingView(data);
                }
            } else {
                printStatusElement.className = 'status-value';
                
                if (!isActivePrint || !hasValidSession) {
                    stopRequestInProgress = false;
                    forcedClosed = false;
                    // REMOVED: closePrintingView(); - This was causing the infinite recursion
                }
            }
        }
        
        currentPrintStatus = newPrintStatus;
        
        // Update progress
        const progressElement = document.getElementById('progressStatus');
        const progressBar = document.getElementById('progressBar');
        if (progressElement && progressBar && data.print_status) {
            const progress = data.print_status.progress_percent || 0;
            progressElement.textContent = `${progress.toFixed(1)}%`;
            progressBar.style.width = `${progress}%`;
        }
        
        // Update Z position
        const zPositionElement = document.getElementById('zPosition');
        if (zPositionElement) {
            zPositionElement.textContent = `${data.z_position?.toFixed(2) || '0.00'} mm`;
        }
        
        // This is the critical line that updates your button states
        updateButtonStates(data.connected, newPrintStatus);
        
    } catch (error) {
        console.debug('Status update failed:', error);
        updateButtonStates(false, 'ERROR');
    }
}

// Check USB status
async function checkUSB() {
    try {
        const response = await fetch('/api/usb_status');
        const data = await response.json();
        
        const usbServiceElement = document.getElementById('usbService');
        if (usbServiceElement) {
            usbServiceElement.textContent = data.service_running ? 'Running' : 'Stopped';
        }
        
        const usbMountElement = document.getElementById('usbMount');
        if (usbMountElement) {
            usbMountElement.textContent = data.mounted ? 'Mounted' : 'Not Mounted';
        }
        
        const usbSpaceElement = document.getElementById('usbSpace');
        if (usbSpaceElement && data.usb_space) {
            const freeGB = (data.usb_space.free / (1024 * 1024 * 1024)).toFixed(1);
            usbSpaceElement.textContent = `${freeGB} GB`;
        }
        
    } catch (error) {
        console.debug('USB status check failed:', error);
    }
}

// Refresh file list
async function refreshFiles() {
    try {
        // Use the modern file manager if available
        if (window.modernFileManager && typeof window.modernFileManager.refreshFiles === 'function') {
            await window.modernFileManager.refreshFiles();
            return;
        }
        
        // Fallback to old method if modern file manager not available
        const response = await fetch('/api/files');
        const files = await response.json();
        
        const fileListElement = document.getElementById('fileList');
        if (!fileListElement) return;
        
        if (files.length === 0) {
            fileListElement.innerHTML = '<div class="empty-state">No files found</div>';
            return;
        }
        
        fileListElement.innerHTML = files.map(file => `
            <div class="file-item">
                <div class="file-thumbnail">
                    ${file.thumbnail ? 
                        `<img src="/api/thumbnails/${file.thumbnail}" alt="${file.name}" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="console.error('Thumbnail failed to load:', this.src); this.style.display='none'; this.nextElementSibling.style.display='flex';" onload="console.log('Thumbnail loaded successfully:', this.src); this.nextElementSibling.style.display='none';">
                         <div class="thumbnail-placeholder" style="display: none;">
                             <i class="fas fa-file"></i>
                             <span>${file.extension ? file.extension.toUpperCase() : 'FILE'}</span>
                         </div>` : 
                        `<div class="thumbnail-placeholder">
                            <i class="fas fa-file"></i>
                            <span>${file.extension ? file.extension.toUpperCase() : 'FILE'}</span>
                         </div>`
                    }
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">${formatFileSize(file.size)} • ${file.modified}</div>
                </div>
                <div class="file-actions">
                    <button class="btn file-btn btn-success" onclick="selectAndPrint('${file.name}')">Print</button>
                    <button class="btn file-btn" onclick="downloadFile('${file.name}')">Download</button>
                    <button class="btn file-btn btn-danger" onclick="deleteFile('${file.name}')">Delete</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Failed to refresh files:', error);
        addConsoleMessage('Failed to refresh file list', 'error');
    }
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Thumbnail management
async function regenerateThumbnails() {
    try {
        addConsoleMessage('Starting thumbnail regeneration...', 'info');
        
        // Show loading state
        const regenerateBtn = document.querySelector('button[onclick="regenerateThumbnails()"]');
        const originalText = regenerateBtn ? regenerateBtn.textContent : '🖼️ Regenerate Thumbnails';
        if (regenerateBtn) {
            regenerateBtn.textContent = '🔄 Generating...';
            regenerateBtn.disabled = true;
        }
        
        const response = await fetch('/api/regenerate_thumbnails', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            addConsoleMessage(`Thumbnail regeneration completed: ${result.regenerated} thumbnails generated`, 'success');
            showAlert(`Regenerated ${result.regenerated} thumbnails`, 'success');
            // Refresh the file list to show new thumbnails
            if (window.modernFileManager && typeof window.modernFileManager.refreshFiles === 'function') {
                await window.modernFileManager.refreshFiles();
            } else {
                await refreshFiles();
            }
        } else {
            addConsoleMessage(`Thumbnail regeneration failed: ${result.error}`, 'error');
            showAlert(`Thumbnail regeneration failed: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Failed to regenerate thumbnails:', error);
        addConsoleMessage('Failed to regenerate thumbnails', 'error');
        showAlert('Failed to regenerate thumbnails', 'error');
    } finally {
        // Restore button state
        const regenerateBtn = document.querySelector('button[onclick="regenerateThumbnails()"]');
        if (regenerateBtn) {
            regenerateBtn.textContent = '🖼️ Regenerate Thumbnails';
            regenerateBtn.disabled = false;
        }
    }
}

// Alert system
function showAlert(message, type = 'info') {
    const alertArea = document.getElementById('alertArea');
    if (!alertArea) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    alertArea.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
}

// Console message system
function addConsoleMessage(message, type = 'info') {
    const consoleArea = document.getElementById('consoleArea');
    if (!consoleArea) return;
    
    const time = new Date().toLocaleTimeString();
    const consoleLine = document.createElement('div');
    consoleLine.className = `console-line ${type}`;
    consoleLine.textContent = `[${time}] ${message}`;
    
    consoleArea.appendChild(consoleLine);
    
    const lines = consoleArea.children;
    if (lines.length > maxConsoleLines) {
        consoleArea.removeChild(lines[0]);
    }
    
    consoleArea.scrollTop = consoleArea.scrollHeight;
}

// ============= PRINTER CONTROLS =============

async function connectPrinter() {
    try {
        const response = await fetch('/api/connect', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            showAlert('Connected to printer', 'success');
            addConsoleMessage('Printer connected', 'success');
            
            // FORCE UI UPDATE - Add this line:
            updateButtonStates(true, 'IDLE');
            
            updateStatus();
        } else {
            showAlert(`Connection failed: ${result.error}`, 'error');
        }
    } catch (error) {
        showAlert(`Connection error: ${error.message}`, 'error');
    }
}

async function disconnectPrinter() {
    try {
        const response = await fetch('/api/disconnect', { method: 'POST' });
        const result = await response.json();
        
        showAlert(result.message, result.success ? 'success' : 'error');
        addConsoleMessage(result.message, result.success ? 'success' : 'error');
        
        if (result.success) {
            updateStatus();
        }
    } catch (error) {
        showAlert(`Disconnect error: ${error.message}`, 'error');
    }
}

// Enhanced selectAndPrint with proper session management
async function selectAndPrint(filename) {
    console.log('🖨️ selectAndPrint called with filename:', filename);
    
    if (!confirm(`Start printing ${filename}?`)) return;
    
    try {
        addConsoleMessage(`Starting print: ${filename}`, 'info');
        
        console.log('🖨️ Calling /api/print_file with filename:', filename);
        
        const response = await fetch('/api/print_file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });
        
        console.log('🖨️ Response status:', response.status);
        
        const result = await response.json();
        console.log('🖨️ Response result:', result);
        
        if (result.success) {
            // Create new print session immediately
            const newSession = generatePrintSession();
            setCurrentPrintSession(newSession);
            localStorage.removeItem('overlayDisabledForSession');
            
            showAlert(`Print started: ${filename}`, 'success');
            addConsoleMessage(`Print started: ${filename}`, 'success');
            console.log('🆕 New print session created:', newSession);
            
            setTimeout(updateStatus, 1000);
        } else {
            showAlert(`Print failed: ${result.error}`, 'error');
            addConsoleMessage(`Print failed: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('🖨️ Print error:', error);
        showAlert(`Print error: ${error.message}`, 'error');
        addConsoleMessage(`Print error: ${error.message}`, 'error');
    }
}

async function startPrint() {
    try {
        const response = await fetch('/api/start', { method: 'POST' });
        const result = await response.json();
        
        showAlert(result.message, result.success ? 'success' : 'error');
        addConsoleMessage(result.message, result.success ? 'success' : 'error');
        
        if (result.success) {
            updateStatus();
        }
    } catch (error) {
        showAlert(`Start error: ${error.message}`, 'error');
    }
}

async function pausePrint() {
    try {
        const response = await fetch('/api/pause', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message, 'success');
            addConsoleMessage(result.message, 'success');
            updateStatus();
        } else {
            showAlert(result.message || 'Failed to pause print', 'error');
            addConsoleMessage(result.message || 'Failed to pause print', 'error');
        }
    } catch (error) {
        console.error('Pause error:', error);
        showAlert(`Pause error: ${error.message}`, 'error');
        addConsoleMessage(`Pause error: ${error.message}`, 'error');
    }
}

async function resumePrint() {
    try {
        const response = await fetch('/api/resume', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message, 'success');
            addConsoleMessage(result.message, 'success');
            updateStatus();
        } else {
            showAlert(result.message || 'Failed to resume print', 'error');
            addConsoleMessage(result.message || 'Failed to resume print', 'error');
        }
    } catch (error) {
        console.error('Resume error:', error);
        showAlert(`Resume error: ${error.message}`, 'error');
        addConsoleMessage(`Resume error: ${error.message}`, 'error');
    }
}

// Enhanced stopPrint with complete session cleanup
async function stopPrint() {
    if (!confirm('Stop current print job?')) return;
    
    try {
        stopRequestInProgress = true;
        forcedClosed = true;
        
        disableOverlayForCurrentPrint();
        
        // Close overlay if it's open
        if (typeof closePrintingOverlay === 'function') {
            closePrintingOverlay();
            printingOverlayVisible = false;
        }
        
        console.log('🛑 Stopping print job...');
        addConsoleMessage('Stopping print job...', 'info');
        
        const response = await fetch('/api/stop', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message, 'success');
            addConsoleMessage(result.message, 'success');
            
            setTimeout(() => {
                clearOverlayDisableAndSession();
                forceResetPrinterState();
                stopRequestInProgress = false;
                forcedClosed = false;
                console.log('✅ Print session ended after stop');
                updateStatus();
            }, 3000);
            
        } else {
            showAlert(result.message || 'Failed to stop print', 'error');
            addConsoleMessage(result.message || 'Failed to stop print', 'error');
            
            stopRequestInProgress = false;
            forcedClosed = false;
        }
    } catch (error) {
        console.error('Stop error:', error);
        showAlert(`Stop error: ${error.message}`, 'error');
        addConsoleMessage(`Stop error: ${error.message}`, 'error');
        
        stopRequestInProgress = false;
        forcedClosed = false;
    }
}

async function moveZ(distance) {
    try {
        const response = await fetch('/api/move_z', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ distance })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addConsoleMessage(`Moved Z by ${distance}mm`, 'success');
        } else {
            showAlert(`Move failed: ${result.error}`, 'error');
        }
    } catch (error) {
        showAlert(`Move error: ${error.message}`, 'error');
    }
}

async function homeZ() {
    try {
        const response = await fetch('/api/home_z', { method: 'POST' });
        const result = await response.json();
        
        showAlert(result.message, result.success ? 'success' : 'error');
        addConsoleMessage(result.message, result.success ? 'success' : 'error');
    } catch (error) {
        showAlert(`Home error: ${error.message}`, 'error');
    }
}

// ============= FILE MANAGEMENT =============

async function downloadFile(filename) {
    try {
        const url = `/api/download/${encodeURIComponent(filename)}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        addConsoleMessage(`Downloaded: ${filename}`, 'success');
    } catch (error) {
        showAlert(`Download error: ${error.message}`, 'error');
    }
}

async function deleteFile(filename) {
    if (!confirm(`Delete ${filename}?`)) return;
    
    try {
        const response = await fetch(`/api/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
        const result = await response.json();
        
        if (result.success) {
            showAlert(`Deleted: ${filename}`, 'success');
            addConsoleMessage(`Deleted: ${filename}`, 'success');
            // Use modern file manager if available
            if (window.modernFileManager && typeof window.modernFileManager.refreshFiles === 'function') {
                await window.modernFileManager.refreshFiles();
            } else {
                refreshFiles();
            }
        } else {
            showAlert(`Delete failed: ${result.error}`, 'error');
        }
    } catch (error) {
        showAlert(`Delete error: ${error.message}`, 'error');
    }
}

async function cleanupFiles() {
    if (!confirm('Remove old files to free space?')) return;
    
    try {
        const response = await fetch('/api/cleanup_files', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            showAlert(`Cleanup completed: ${result.deleted_count} files removed`, 'success');
            addConsoleMessage(result.message, 'success');
            // Use modern file manager if available
            if (window.modernFileManager && typeof window.modernFileManager.refreshFiles === 'function') {
                await window.modernFileManager.refreshFiles();
            } else {
                refreshFiles();
            }
        } else {
            showAlert(`Cleanup failed: ${result.error}`, 'error');
        }
    } catch (error) {
        showAlert(`Cleanup error: ${error.message}`, 'error');
    }
}

async function showStorageStats() {
    try {
        const response = await fetch('/api/storage_stats');
        const stats = await response.json();
        
        const totalFilesElement = document.getElementById('totalFiles');
        const totalSizeElement = document.getElementById('totalSize');
        const storageStatsElement = document.getElementById('storageStats');
        
        if (totalFilesElement) totalFilesElement.textContent = stats.total_files || 0;
        if (totalSizeElement) totalSizeElement.textContent = formatFileSize(stats.total_file_size || 0);
        if (storageStatsElement) storageStatsElement.style.display = 'block';
        
        addConsoleMessage('Storage statistics updated', 'info');
    } catch (error) {
        showAlert(`Stats error: ${error.message}`, 'error');
    }
}

// ============= USB MANAGEMENT =============

async function recoverUSB() {
    try {
        showAlert('Recovering USB system...', 'info');
        addConsoleMessage('Starting USB recovery...', 'info');
        
        const response = await fetch('/api/recover_usb_error', { method: 'POST' });
        const result = await response.json();
        
        showAlert(result.message, result.success ? 'success' : 'error');
        addConsoleMessage(result.message, result.success ? 'success' : 'error');
        
        if (result.success) {
            setTimeout(() => {
                checkUSB();
                // Use modern file manager if available
                if (window.modernFileManager && typeof window.modernFileManager.refreshFiles === 'function') {
                    window.modernFileManager.refreshFiles();
                } else {
                    refreshFiles();
                }
            }, 2000);
        }
    } catch (error) {
        showAlert(`Recovery error: ${error.message}`, 'error');
        addConsoleMessage(`Recovery error: ${error.message}`, 'error');
    }
}

// ============= SETTINGS INTEGRATION =============

// Function to update app settings from settings modal
window.updateAppSettings = function(newSettings) {
    appSettings = { ...appSettings, ...newSettings };
    
    applySettings();
    
    // Camera settings handled by simple-camera.js
    
    // If overlay was re-enabled, clear any disabled session
    if (newSettings.showPrintingOverlay === true) {
        localStorage.removeItem('overlayDisabledForSession');
        console.log('📺 Printing overlay re-enabled in settings');
    }
    
    if (newSettings.updateInterval && newSettings.updateInterval !== (updateInterval / 1000)) {
        startUpdateCycle();
    }
};

// ============= GLOBAL FUNCTION EXPORTS =============

// Make essential functions globally available
window.showAlert = showAlert;
window.addConsoleMessage = addConsoleMessage;
window.loadAppSettings = loadAppSettings;

// Make all control functions globally available
window.connectPrinter = connectPrinter;
window.disconnectPrinter = disconnectPrinter;
window.selectAndPrint = selectAndPrint;
window.startPrint = startPrint;
window.pausePrint = pausePrint;
window.resumePrint = resumePrint;
window.stopPrint = stopPrint;
window.moveZ = moveZ;
window.homeZ = homeZ;
window.downloadFile = downloadFile;
window.deleteFile = deleteFile;
window.cleanupFiles = cleanupFiles;
window.showStorageStats = showStorageStats;
window.recoverUSB = recoverUSB;
window.refreshFiles = refreshFiles;
window.showPrintingView = showPrintingView;
window.closePrintingView = closePrintingView;
window.forceClosePrintingView = forceClosePrintingView;
window.updateButtonStates = updateButtonStates;
window.updateCameraVisibility = updateCameraVisibility;

// Backward compatibility functions for existing overlay system
window.showPrintingOverlay = showPrintingView;
window.closePrintingOverlay = closePrintingView;
window.forceClosePrintingOverlay = forceClosePrintingView;

// Export camera visibility function
window.updateCameraVisibility = updateCameraVisibility;

console.log('✅ Main application with external camera stream loaded successfully');

// FEATURE SUMMARY
console.log(`
🎯 COMPLETE RESIN PRINT PORTAL WITH EXTERNAL CAMERA STREAM:
✅ Full printer control and file management
✅ Working addon system with removal functionality  
✅ External camera stream integration
✅ Fullscreen camera view with controls
✅ Session-based printing overlay management
✅ Complete settings integration
✅ Keyboard shortcuts for camera control

📷 External Camera Features:
- Direct stream from external camera server
- Fullscreen support with F key
- Error handling and recovery
- Visual status indicators

🎮 Keyboard Shortcuts:
- Esc: Close overlay/modal
- Ctrl+C: Toggle camera (in printing overlay)
- F: Fullscreen camera (in printing overlay)
- Space: Pause/Resume (in printing overlay)
- Ctrl+,: Open settings
- F1: Show shortcuts help

🎉 EXTERNAL CAMERA STREAM INTEGRATION COMPLETE!
`);