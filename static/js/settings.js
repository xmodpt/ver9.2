/**
 * Complete Settings Management with FIXED Addon Removal
 * Updated to properly remove addons from filesystem
 */

let currentSettingsTab = 'general';
let currentSettings = {};
let availableAddons = [];
let currentAddonConfig = null;

// Initialize settings
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
});

// Open settings modal
async function openSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('active');
    
    // Load current settings
    await loadSettings();
    
    // Debug: Log current settings
    console.log('📋 Current settings loaded:', currentSettings);
    
    // Switch to general tab by default
    switchSettingsTab('general');
    
    if (typeof addConsoleMessage === 'function') {
        addConsoleMessage('Settings opened', 'info');
    }
}

// Close settings modal
function closeSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('active');
    if (typeof addConsoleMessage === 'function') {
        addConsoleMessage('Settings closed', 'info');
    }
}

// Switch between settings tabs
function switchSettingsTab(tabName) {
    currentSettingsTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.querySelector(`[onclick="switchSettingsTab('${tabName}')"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Load tab content
    loadSettingsTabContent(tabName);
}

// Load settings tab content
function loadSettingsTabContent(tabName) {
    const contentContainer = document.getElementById('settingsContent');
    
    switch (tabName) {
        case 'general':
            contentContainer.innerHTML = generateGeneralSettings();
            break;
        case 'printer':
            contentContainer.innerHTML = generatePrinterSettings();
            break;
        case 'interface':
            contentContainer.innerHTML = generateInterfaceSettings();
            break;
        case 'addons':
            loadAddonSettings();
            break;
        default:
            contentContainer.innerHTML = '<div class="settings-loading">Unknown tab</div>';
    }
}

// Generate general settings content
function generateGeneralSettings() {
    console.log('🔧 Generating general settings with:', currentSettings);
    return `
        <div class="settings-section">
            <div class="settings-section-title">🔧 Application Settings</div>
            <div class="settings-section-description">
                Configure general application behavior and preferences.
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="enableCamera" ${(currentSettings.enableCamera !== false && currentSettings.enableCamera !== undefined) ? 'checked' : ''}>
                    Enable Camera Stream
                </label>
                <div class="help-text">Show camera stream in the main interface</div>
            </div>
            
            <div class="settings-form-group">
                <label for="cameraStreamUrl">Camera Stream URL</label>
                <input type="text" id="cameraStreamUrl" 
                               value="${currentSettings.cameraStreamUrl || ''}"
        placeholder="Camera URL will be auto-detected">
                <div class="help-text">Complete URL to your external MJPEG camera stream</div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="autoConnect" ${currentSettings.autoConnect ? 'checked' : ''}>
                    Auto-connect to Printer
                </label>
                <div class="help-text">Automatically connect to printer on startup</div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="enableNotifications" ${currentSettings.enableNotifications ? 'checked' : ''}>
                    Enable Notifications
                </label>
                <div class="help-text">Show browser notifications for print events</div>
            </div>
            
            <div class="settings-form-row">
                <div class="settings-form-group">
                    <label for="updateInterval">Status Update Interval (seconds)</label>
                    <input type="number" id="updateInterval" value="${currentSettings.updateInterval || 3}" min="1" max="30">
                    <div class="help-text">How often to check printer status</div>
                </div>
                
                <div class="settings-form-group">
                    <label for="maxConsoleLines">Console History Lines</label>
                    <input type="number" id="maxConsoleLines" value="${currentSettings.maxConsoleLines || 50}" min="10" max="500">
                    <div class="help-text">Maximum console messages to keep</div>
                </div>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="settings-section-title">💾 File Management</div>
            <div class="settings-section-description">
                Configure file handling and storage options.
            </div>
            
            <div class="settings-form-row">
                <div class="settings-form-group">
                    <label for="maxFiles">Maximum Files to Keep</label>
                    <input type="number" id="maxFiles" value="${currentSettings.maxFiles || 50}" min="10" max="200">
                    <div class="help-text">Auto-cleanup will keep this many files</div>
                </div>
                
                <div class="settings-form-group">
                    <label for="maxFileAge">Maximum File Age (days)</label>
                    <input type="number" id="maxFileAge" value="${currentSettings.maxFileAge || 30}" min="1" max="365">
                    <div class="help-text">Auto-cleanup removes files older than this</div>
                </div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="autoCleanup" ${currentSettings.autoCleanup ? 'checked' : ''}>
                    Enable Auto-cleanup
                </label>
                <div class="help-text">Automatically remove old files based on settings above</div>
            </div>
            
            <div class="settings-form-group">
                <label for="allowedExtensions">Allowed File Extensions</label>
                <input type="text" id="allowedExtensions" value="${currentSettings.allowedExtensions || '.ctb,.cbddlp,.pwmx,.pwmo,.pwms,.pws,.pw0,.pwx'}">
                <div class="help-text">Comma-separated list of allowed file extensions</div>
            </div>
        </div>
    `;
}

// Generate printer settings content
function generatePrinterSettings() {
    return `
        <div class="settings-section">
            <div class="settings-section-title">🖨️ Printer Connection</div>
            <div class="settings-section-description">
                Configure printer communication settings.
            </div>
            
            <div class="settings-form-row">
                <div class="settings-form-group">
                    <label for="serialPort">Serial Port</label>
                    <select id="serialPort" onchange="toggleCustomPort()">
                        <option value="/dev/serial0" ${currentSettings.serialPort === '/dev/serial0' ? 'selected' : ''}>/dev/serial0 (Default)</option>
                        <option value="/dev/ttyUSB0" ${currentSettings.serialPort === '/dev/ttyUSB0' ? 'selected' : ''}>/dev/ttyUSB0</option>
                        <option value="/dev/ttyACM0" ${currentSettings.serialPort === '/dev/ttyACM0' ? 'selected' : ''}>/dev/ttyACM0</option>
                        <option value="custom" ${currentSettings.serialPort === 'custom' ? 'selected' : ''}>Custom Port</option>
                    </select>
                    <div class="help-text">Serial port for printer communication</div>
                </div>
                
                <div class="settings-form-group">
                    <label for="baudRate">Baud Rate</label>
                    <select id="baudRate">
                        <option value="9600" ${currentSettings.baudRate == 9600 ? 'selected' : ''}>9600</option>
                        <option value="115200" ${currentSettings.baudRate == 115200 ? 'selected' : ''}>115200 (Default)</option>
                        <option value="250000" ${currentSettings.baudRate == 250000 ? 'selected' : ''}>250000</option>
                    </select>
                    <div class="help-text">Communication speed</div>
                </div>
            </div>
            
            <div class="settings-form-group" id="customPortGroup" style="display: ${currentSettings.serialPort === 'custom' ? 'block' : 'none'};">
                <label for="customSerialPort">Custom Serial Port</label>
                <input type="text" id="customSerialPort" value="${currentSettings.customSerialPort || ''}" placeholder="/dev/ttyXXX">
                <div class="help-text">Enter custom serial port path</div>
            </div>
            
            <div class="settings-form-row">
                <div class="settings-form-group">
                    <label for="timeout">Communication Timeout (seconds)</label>
                    <input type="number" id="timeout" value="${currentSettings.timeout || 5}" min="1" max="30" step="0.5">
                    <div class="help-text">Timeout for printer commands</div>
                </div>
                
                <div class="settings-form-group">
                    <label for="retryAttempts">Retry Attempts</label>
                    <input type="number" id="retryAttempts" value="${currentSettings.retryAttempts || 3}" min="1" max="10">
                    <div class="help-text">Number of retries for failed commands</div>
                </div>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="settings-section-title">🎮 Movement Settings</div>
            <div class="settings-section-description">
                Configure Z-axis movement and positioning.
            </div>
            
            <div class="settings-form-row">
                <div class="settings-form-group">
                    <label for="zSpeed">Z-Axis Speed (mm/min)</label>
                    <input type="number" id="zSpeed" value="${currentSettings.zSpeed || 600}" min="100" max="2000">
                    <div class="help-text">Speed for Z-axis movements</div>
                </div>
                
                <div class="settings-form-group">
                    <label for="homeSpeed">Homing Speed (mm/min)</label>
                    <input type="number" id="homeSpeed" value="${currentSettings.homeSpeed || 300}" min="50" max="1000">
                    <div class="help-text">Speed for homing operations</div>
                </div>
            </div>
            
            <div class="settings-form-group">
                <label for="customMovements">Custom Movement Buttons</label>
                <input type="text" id="customMovements" value="${currentSettings.customMovements || '0.1,1,5,10'}" placeholder="0.1,1,5,10">
                <div class="help-text">Comma-separated list of movement distances (mm)</div>
            </div>
        </div>
    `;
}

// Generate interface settings content
function generateInterfaceSettings() {
    return `
        <div class="settings-section">
            <div class="settings-section-title">🎨 Theme & Appearance</div>
            <div class="settings-section-description">
                Customize the visual appearance of the interface.
            </div>
            
            <div class="settings-form-group">
                <label>Theme</label>
                <div class="theme-selector">
                    <div class="theme-option ${currentSettings.theme === 'dark' ? 'selected' : ''}" onclick="selectTheme('dark')">
                        <div class="theme-preview theme-dark">
                            <div class="color-1"></div>
                            <div class="color-2"></div>
                            <div class="color-3"></div>
                        </div>
                        <div class="theme-name">Dark (Default)</div>
                    </div>
                    
                    <div class="theme-option ${currentSettings.theme === 'blue' ? 'selected' : ''}" onclick="selectTheme('blue')">
                        <div class="theme-preview theme-blue">
                            <div class="color-1"></div>
                            <div class="color-2"></div>
                            <div class="color-3"></div>
                        </div>
                        <div class="theme-name">Blue Ocean</div>
                    </div>
                    
                    <div class="theme-option ${currentSettings.theme === 'green' ? 'selected' : ''}" onclick="selectTheme('green')">
                        <div class="theme-preview theme-green">
                            <div class="color-1"></div>
                            <div class="color-2"></div>
                            <div class="color-3"></div>
                        </div>
                        <div class="theme-name">Forest Green</div>
                    </div>
                    
                    <div class="theme-option ${currentSettings.theme === 'purple' ? 'selected' : ''}" onclick="selectTheme('purple')">
                        <div class="theme-preview theme-purple">
                            <div class="color-1"></div>
                            <div class="color-2"></div>
                            <div class="color-3"></div>
                        </div>
                        <div class="theme-name">Royal Purple</div>
                    </div>
                </div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="compactMode" ${currentSettings.compactMode ? 'checked' : ''}>
                    Compact Mode
                </label>
                <div class="help-text">Reduce spacing and use smaller elements</div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="showAnimations" ${currentSettings.showAnimations !== false ? 'checked' : ''}>
                    Enable Animations
                </label>
                <div class="help-text">Show smooth transitions and hover effects</div>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="settings-section-title">📱 Layout Options</div>
            <div class="settings-section-description">
                Configure interface layout and display options.
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="showToolbar" ${currentSettings.showToolbar !== false ? 'checked' : ''}>
                    Show Toolbar
                </label>
                <div class="help-text">Display the top toolbar with quick actions</div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="showConsole" ${currentSettings.showConsole !== false ? 'checked' : ''}>
                    Show Console
                </label>
                <div class="help-text">Display the console events section</div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="showStatusBar" ${currentSettings.showStatusBar !== false ? 'checked' : ''}>
                    Show Status Bar
                </label>
                <div class="help-text">Display the status information at the top</div>
            </div>
            
            <div class="settings-form-group">
                <label for="defaultView">Default View</label>
                <select id="defaultView">
                    <option value="dashboard" ${currentSettings.defaultView === 'dashboard' ? 'selected' : ''}>Dashboard (Default)</option>
                    <option value="files" ${currentSettings.defaultView === 'files' ? 'selected' : ''}>File Manager</option>
                    <option value="control" ${currentSettings.defaultView === 'control' ? 'selected' : ''}>Printer Controls</option>
                </select>
                <div class="help-text">Default view when opening the application</div>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="settings-section-title">🖨️ Printing Interface</div>
            <div class="settings-section-description">
                Configure printing-related interface options and behavior.
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="showPrintingOverlay" ${currentSettings.showPrintingOverlay !== false ? 'checked' : ''}>
                    Show Printing Overlay
                </label>
                <div class="help-text">Display full-screen overlay during printing with progress and controls</div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="autoPauseOnError" ${currentSettings.autoPauseOnError ? 'checked' : ''}>
                    Auto-pause on Errors
                </label>
                <div class="help-text">Automatically pause printing when errors are detected</div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="showPrintStats" ${currentSettings.showPrintStats !== false ? 'checked' : ''}>
                    Show Detailed Print Statistics
                </label>
                <div class="help-text">Display detailed progress, time estimates, and layer information</div>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="settings-section-title">🔧 Advanced Interface</div>
            <div class="settings-section-description">
                Advanced customization options for power users.
            </div>
            
            <div class="settings-form-group">
                <label for="customCSS">Custom CSS</label>
                <textarea id="customCSS" rows="6" placeholder="/* Add your custom CSS here */">${currentSettings.customCSS || ''}</textarea>
                <div class="help-text">Add custom CSS to override default styles</div>
            </div>
        </div>
    `;
}

// Load addon settings content with FIXED upload and removal functionality
async function loadAddonSettings() {
    const contentContainer = document.getElementById('settingsContent');
    contentContainer.innerHTML = '<div class="settings-loading"><div class="settings-loading-spinner">⚙️</div>Loading addons...</div>';
    
    try {
        const response = await fetch('/addons/list');
        availableAddons = await response.json();
        console.log('📋 Loaded addons:', availableAddons);
        contentContainer.innerHTML = generateAddonSettings();
        
        // Setup addon installation handlers AFTER the HTML is inserted
        setupAddonInstallation();
        
    } catch (error) {
        console.error('❌ Failed to load addons:', error);
        contentContainer.innerHTML = `
            <div class="settings-section">
                <div class="settings-section-title">❌ Error Loading Addons</div>
                <div class="settings-section-description">
                    Failed to load addon information: ${error.message}
                </div>
            </div>
        `;
    }
}

// Generate addon settings content
function generateAddonSettings() {
    return `
        <div class="settings-section">
            <div class="settings-section-title">🧩 Addon Manager</div>
            <div class="settings-section-description">
                Manage installed addons and configure their settings. FIXED: Removal now deletes files from filesystem.
            </div>
            
            <div class="addon-manager">
                <div class="addon-list">
                    ${availableAddons.length === 0 ? 
                        '<div class="empty-state">No addons found. Install addons to extend functionality.</div>' :
                        availableAddons.map(addon => {
                            const isEnabled = addon.enabled;
                            const canConfigure = isEnabled && (addon.type === 'card' || addon.type === 'toolbar');
                            
                            return `
                            <div class="addon-item">
                                <div class="addon-info">
                                    <div class="addon-name">
                                        ${getAddonIcon(addon.type)} ${addon.name}
                                        <span class="addon-version">v${addon.version}</span>
                                    </div>
                                    <div class="addon-description">${addon.description}</div>
                                    <div class="addon-meta">
                                        <span>By ${addon.author}</span>
                                        <span class="addon-type">${addon.type}</span>
                                        <span class="addon-status ${isEnabled ? 'enabled' : 'disabled'}">
                                            ${isEnabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>
                                <div class="addon-actions">
                                    ${isEnabled ? 
                                        `<button class="btn btn-warning" onclick="disableAddon('${addon.app_name || addon.name}')">Disable</button>` :
                                        `<button class="btn btn-success" onclick="enableAddon('${addon.app_name || addon.name}')">Enable</button>`
                                    }
                                    ${canConfigure ? 
                                        `<button class="btn btn-primary" onclick="configureAddon('${addon.app_name || addon.name}')">⚙️ Configure</button>` : ''
                                    }
                                    <button class="btn btn-danger" onclick="removeAddonFixed('${addon.app_name || addon.name}')" title="Remove from filesystem">🗑️ Remove</button>
                                </div>
                            </div>
                            `;
                        }).join('')
                    }
                </div>
                
                <div class="addon-install-section">
                    <h4>Install New Addon</h4>
                    <div class="addon-install-area" id="addonInstallArea">
                        <input type="file" id="addonFileInput" accept=".zip" style="display: none;">
                        <div class="addon-install-icon">📦</div>
                        <div class="addon-install-text">Drop ZIP file here or click to browse</div>
                        <div class="addon-install-hint">Upload addon ZIP files for automatic installation</div>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-success" onclick="triggerAddonUpload()">📤 Upload ZIP File</button>
                        <button class="btn" onclick="refreshAddonList()">🔄 Refresh List</button>
                        <button class="btn btn-warning" onclick="debugAddonDirectories()">🔍 Debug Directories</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Setup addon installation drag-and-drop and file input
function setupAddonInstallation() {
    const installArea = document.getElementById('addonInstallArea');
    const fileInput = document.getElementById('addonFileInput');
    
    if (!installArea || !fileInput) {
        console.warn('⚠️ Addon installation elements not found');
        return;
    }
    
    console.log('🔧 Setting up addon installation handlers');
    
    // Click to browse files
    installArea.onclick = function(e) {
        e.preventDefault();
        fileInput.click();
    };
    
    // Drag and drop functionality
    installArea.ondragover = function(e) {
        e.preventDefault();
        installArea.classList.add('dragover');
    };
    
    installArea.ondragleave = function(e) {
        e.preventDefault();
        installArea.classList.remove('dragover');
    };
    
    installArea.ondrop = function(e) {
        e.preventDefault();
        installArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleAddonFiles(files);
        }
    };
    
    // File input change handler
    fileInput.onchange = function(e) {
        if (e.target.files.length > 0) {
            handleAddonFiles(e.target.files);
        }
    };
    
    console.log('✅ Addon installation handlers set up successfully');
}

// Trigger file upload dialog
function triggerAddonUpload() {
    const fileInput = document.getElementById('addonFileInput');
    if (fileInput) {
        fileInput.click();
    } else {
        console.error('❌ File input not found');
    }
}

// Handle uploaded addon files
async function handleAddonFiles(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.zip')) {
        if (typeof showAlert === 'function') {
            showAlert('Please select a ZIP file', 'error');
        } else {
            alert('Please select a ZIP file');
        }
        return;
    }
    
    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
        if (typeof showAlert === 'function') {
            showAlert('File is too large. Maximum size is 50MB', 'error');
        } else {
            alert('File is too large. Maximum size is 50MB');
        }
        return;
    }
    
    try {
        if (typeof showAlert === 'function') {
            showAlert('Installing addon...', 'info');
        }
        console.log('📦 Installing addon:', file.name);
        
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/addons/install', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (typeof showAlert === 'function') {
                showAlert(`Addon installed successfully: ${file.name}`, 'success');
            } else {
                alert(`Addon installed successfully: ${file.name}`);
            }
            
            if (typeof addConsoleMessage === 'function') {
                addConsoleMessage(`Addon installed: ${file.name}`, 'success');
            }
            
            // Refresh addon list
            await refreshAddonList();
            
            // Show restart message if needed
            if (result.message && result.message.includes('Restart')) {
                if (typeof showAlert === 'function') {
                    showAlert('Addon installed! Restart the application to fully activate it.', 'warning');
                }
            }
            
        } else {
            if (typeof showAlert === 'function') {
                showAlert(`Installation failed: ${result.error}`, 'error');
            } else {
                alert(`Installation failed: ${result.error}`);
            }
            
            if (typeof addConsoleMessage === 'function') {
                addConsoleMessage(`Addon installation failed: ${result.error}`, 'error');
            }
        }
        
    } catch (error) {
        console.error('💥 Addon installation error:', error);
        if (typeof showAlert === 'function') {
            showAlert(`Installation error: ${error.message}`, 'error');
        } else {
            alert(`Installation error: ${error.message}`);
        }
        
        if (typeof addConsoleMessage === 'function') {
            addConsoleMessage(`Addon installation error: ${error.message}`, 'error');
        }
    }
}

// ==================== FIXED ADDON REMOVAL FUNCTIONS ====================

// FIXED Remove addon function - calls the DIRECT Flask route that deletes filesystem files
async function removeAddonFixed(addonName) {
    if (!confirm(`Permanently remove addon "${addonName}" from filesystem?\n\nThis will delete all addon files and cannot be undone.`)) return;
    
    try {
        console.log(`🗑️ REMOVING ADDON FROM FILESYSTEM: ${addonName}`);
        
        // Show loading state
        if (typeof showAlert === 'function') {
            showAlert('Removing addon and deleting files from filesystem...', 'info');
        }
        
        if (typeof addConsoleMessage === 'function') {
            addConsoleMessage(`Removing addon from filesystem: ${addonName}`, 'info');
        }
        
        // Call the DIRECT Flask route that actually deletes files from filesystem
        const response = await fetch(`/api/addons/${encodeURIComponent(addonName)}/remove`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        console.log('🔍 Filesystem removal response:', result);
        
        if (response.ok && result.success) {
            if (typeof showAlert === 'function') {
                showAlert(`✅ Addon "${addonName}" completely removed from filesystem`, 'success');
            }
            
            if (typeof addConsoleMessage === 'function') {
                addConsoleMessage(`✅ Addon removed from filesystem: ${addonName}`, 'success');
            }
            
            console.log(`✅ ADDON COMPLETELY REMOVED: ${addonName} -> Directory: ${result.deleted_directory}`);
            
            // Refresh the addon list immediately
            await refreshAddonList();
            
            // Also refresh main app addons
            if (typeof refreshAddons === 'function') {
                setTimeout(refreshAddons, 500);
            }
            
        } else {
            const errorMsg = result.error || 'Unknown filesystem error occurred';
            console.error(`❌ FILESYSTEM REMOVAL FAILED: ${errorMsg}`);
            
            if (typeof showAlert === 'function') {
                showAlert(`❌ Failed to remove addon from filesystem: ${errorMsg}`, 'error');
            }
            
            if (typeof addConsoleMessage === 'function') {
                addConsoleMessage(`❌ Filesystem removal failed: ${errorMsg}`, 'error');
            }
        }
        
    } catch (error) {
        console.error('💥 Remove addon error:', error);
        
        if (typeof showAlert === 'function') {
            showAlert(`💥 Remove error: ${error.message}`, 'error');
        }
        
        if (typeof addConsoleMessage === 'function') {
            addConsoleMessage(`💥 Addon removal error: ${error.message}`, 'error');
        }
    }
}

// Enhanced force remove with filesystem verification and multiple methods
async function forceRemoveAddonFixed(addonName) {
    if (!confirm(`🔥 FORCE remove addon "${addonName}" from filesystem?\n\nThis will try multiple removal methods and delete all files.`)) return;
    
    try {
        console.log(`💪 FORCE REMOVING ADDON: ${addonName}`);
        
        if (typeof showAlert === 'function') {
            showAlert('🔥 Attempting force removal from filesystem...', 'info');
        }
        
        // Method 1: Get filesystem debug info first
        const debugResponse = await fetch('/api/addons/debug/list_directories');
        if (debugResponse.ok) {
            const debugData = await debugResponse.json();
            console.log('📁 Available addon directories:', debugData.directories);
            
            // Find all possible matches for this addon
            const possibleMatches = debugData.directories.filter(dir => {
                const dirName = dir.directory_name.toLowerCase();
                const addonLower = addonName.toLowerCase();
                
                return dirName === addonLower ||
                       dirName.includes(addonLower) ||
                       addonLower.includes(dirName) ||
                       dirName === addonName.replace(/\s+/g, '_').toLowerCase() ||
                       dirName === addonName.replace(/-/g, '_').toLowerCase();
            });
            
            console.log(`🔍 Found ${possibleMatches.length} possible directory matches:`, possibleMatches);
            
            // Try to remove each match
            let successCount = 0;
            const removedDirectories = [];
            
            for (const match of possibleMatches) {
                console.log(`🎯 Attempting to remove directory: ${match.directory_name}`);
                
                try {
                    const response = await fetch(`/api/addons/${encodeURIComponent(match.directory_name)}/remove`, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success) {
                            console.log(`✅ Successfully removed: ${match.directory_name}`);
                            successCount++;
                            removedDirectories.push(match.directory_name);
                        }
                    }
                } catch (e) {
                    console.warn(`⚠️ Failed to remove ${match.directory_name}:`, e);
                }
            }
            
            if (successCount > 0) {
                if (typeof showAlert === 'function') {
                    showAlert(`🔥 Force removed ${successCount} addon director${successCount > 1 ? 'ies' : 'y'}: ${removedDirectories.join(', ')}`, 'success');
                }
                await refreshAddonList();
                return;
            }
        }
        
        // Method 2: If debug approach failed, try direct variations
        const variations = [
            addonName,
            addonName.toLowerCase(),
            addonName.replace(/\s+/g, '_'),
            addonName.replace(/\s+/g, '_').toLowerCase(),
            addonName.replace(/-/g, '_'),
            addonName.replace(/-/g, '_').toLowerCase(),
            // Try app_name variations from the addon list
            ...getAddonAppNameVariations(addonName)
        ];
        
        console.log(`🔄 Trying ${variations.length} name variations:`, variations);
        
        let removed = false;
        let removedWith = '';
        
        for (const variation of variations) {
            try {
                console.log(`🎯 Trying variation: ${variation}`);
                
                const response = await fetch(`/api/addons/${encodeURIComponent(variation)}/remove`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        console.log(`✅ Successfully removed with variation: ${variation}`);
                        removedWith = variation;
                        removed = true;
                        break;
                    }
                }
            } catch (e) {
                console.debug(`❌ Variation ${variation} failed:`, e);
            }
        }
        
        if (removed) {
            if (typeof showAlert === 'function') {
                showAlert(`🔥 Addon force-removed using name: ${removedWith}`, 'success');
            }
            await refreshAddonList();
        } else {
            if (typeof showAlert === 'function') {
                showAlert('💥 All force removal methods failed. Addon may not exist on filesystem.', 'error');
            }
            console.error('💥 All force removal methods failed');
        }
        
    } catch (error) {
        console.error('💥 Force remove error:', error);
        if (typeof showAlert === 'function') {
            showAlert(`💥 Force remove error: ${error.message}`, 'error');
        }
    }
}

// Helper function to get app_name variations from available addons
function getAddonAppNameVariations(addonName) {
    const variations = [];
    
    // Look through availableAddons to find app_name
    if (availableAddons && availableAddons.length > 0) {
        for (const addon of availableAddons) {
            if (addon.name === addonName || addon.app_name === addonName) {
                // Add both name and app_name as variations
                if (addon.app_name && !variations.includes(addon.app_name)) {
                    variations.push(addon.app_name);
                }
                if (addon.name && !variations.includes(addon.name)) {
                    variations.push(addon.name);
                }
            }
        }
    }
    
    return variations;
}

// Enhanced refresh that verifies filesystem state
async function refreshAddonList() {
    console.log('🔄 Refreshing addon list and verifying filesystem...');
    
    try {
        // Show loading state
        const contentContainer = document.getElementById('settingsContent');
        if (contentContainer && currentSettingsTab === 'addons') {
            const loadingHtml = `
                <div class="settings-loading">
                    <div class="settings-loading-spinner">⚙️</div>
                    Refreshing and verifying addons...
                </div>
            `;
            contentContainer.innerHTML = loadingHtml;
        }
        
        // First, get filesystem state
        const debugResponse = await fetch('/api/addons/debug/list_directories');
        if (debugResponse.ok) {
            const debugData = await debugResponse.json();
            console.log('📁 Filesystem directories:', debugData.directories.map(d => d.directory_name));
        }
        
        // Fetch fresh addon list with cache busting
        const response = await fetch('/addons/list?t=' + Date.now());
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        availableAddons = await response.json();
        console.log('📋 Available addons from API:', availableAddons.map(a => a.name || a.app_name));
        
        // Update the UI if we're on the addons tab
        if (contentContainer && currentSettingsTab === 'addons') {
            contentContainer.innerHTML = generateAddonSettings();
            setupAddonInstallation();
        }
        
        // Refresh main app addons as well
        if (typeof refreshAddons === 'function') {
            await refreshAddons();
        }
        
        console.log('✅ Addon list refresh completed with filesystem verification');
        
    } catch (error) {
        console.error('❌ Failed to refresh addon list:', error);
        
        if (typeof showAlert === 'function') {
            showAlert('Failed to refresh addon list', 'error');
        }
        
        // Show error in content if we're on addons tab
        const contentContainer = document.getElementById('settingsContent');
        if (contentContainer && currentSettingsTab === 'addons') {
            contentContainer.innerHTML = `
                <div class="settings-section">
                    <div class="settings-section-title">❌ Error</div>
                    <div class="settings-section-description">
                        Failed to refresh addon list: ${error.message}
                    </div>
                    <button class="btn" onclick="refreshAddonList()">🔄 Try Again</button>
                </div>
            `;
        }
    }
}

// Enhanced debug function with filesystem cleanup analysis
async function debugAddonDirectories() {
    try {
        console.log('🔍 DEBUG: Checking addon filesystem state...');
        
        const response = await fetch('/api/addons/debug/list_directories');
        const data = await response.json();
        
        console.log('=== ADDON FILESYSTEM DEBUG ===');
        console.log('Addon Directory:', data.addon_directory);
        console.log('Physical Directories:', data.directories.length);
        console.log('Memory Addons:', data.addons_in_memory);
        console.log('Enabled Addons:', data.addons_enabled);
        
        console.log('\n📁 DIRECTORY ANALYSIS:');
        data.directories.forEach(dir => {
            const status = [];
            if (dir.has_addon_py) status.push('✅ addon.py');
            if (dir.has_addon_json) status.push('✅ addon.json');
            if (dir.in_addons_dict) status.push('🧠 in memory');
            if (dir.in_enabled_dict) status.push('🟢 enabled');
            
            console.log(`  📂 ${dir.directory_name}: ${status.join(' | ')}`);
        });
        
        console.log('\n🧠 MEMORY ANALYSIS:');
        console.log('Keys in addons dict:', data.addons_dict_keys);
        console.log('Keys in enabled dict:', data.enabled_dict_keys);
        
        // Check for orphaned directories (on filesystem but not in memory)
        const orphanedDirs = data.directories.filter(dir => !dir.in_addons_dict);
        if (orphanedDirs.length > 0) {
            console.log('\n⚠️ ORPHANED DIRECTORIES (filesystem only):');
            orphanedDirs.forEach(dir => {
                console.log(`  🗂️ ${dir.directory_name} - ${dir.file_count} files`);
            });
        }
        
        console.log('===============================');
        
        // Create detailed alert
        const summary = [
            `📊 ADDON FILESYSTEM ANALYSIS`,
            ``,
            `📁 Physical Directories: ${data.directories.length}`,
            `🧠 In Memory: ${data.addons_in_memory}`,
            `🟢 Enabled: ${data.addons_enabled}`,
            ``,
            `📂 Directories:`,
            ...data.directories.map(d => `  • ${d.directory_name} (${d.file_count} files)`),
        ];
        
        if (orphanedDirs.length > 0) {
            summary.push('', '⚠️ Orphaned directories found!');
            summary.push('These exist on filesystem but not in memory.');
            summary.push('They may be leftover from failed removals.');
        }
        
        if (typeof showAlert === 'function') {
            showAlert('📊 Check console for detailed filesystem debug info', 'info');
        } else {
            alert(summary.join('\n'));
        }
        
    } catch (error) {
        console.error('💥 Debug error:', error);
        if (typeof showAlert === 'function') {
            showAlert('Debug failed: ' + error.message, 'error');
        }
    }
}

// ==================== ADDON MANAGEMENT FUNCTIONS ====================

async function enableAddon(addonName) {
    try {
        const response = await fetch(`/api/addons/${encodeURIComponent(addonName)}/enable`, {
            method: 'POST'
        });
        
        if (response.ok) {
            if (typeof showAlert === 'function') {
                showAlert(`Addon "${addonName}" enabled`, 'success');
            }
            await refreshAddonList();
        } else {
            const error = await response.json();
            if (typeof showAlert === 'function') {
                showAlert(`Failed to enable addon: ${error.error}`, 'error');
            }
        }
    } catch (error) {
        if (typeof showAlert === 'function') {
            showAlert(`Enable error: ${error.message}`, 'error');
        }
    }
}

async function disableAddon(addonName) {
    if (!confirm(`Disable addon "${addonName}"?`)) return;
    
    try {
        const response = await fetch(`/api/addons/${encodeURIComponent(addonName)}/disable`, {
            method: 'POST'
        });
        
        if (response.ok) {
            if (typeof showAlert === 'function') {
                showAlert(`Addon "${addonName}" disabled`, 'success');
            }
            await refreshAddonList();
        } else {
            const error = await response.json();
            if (typeof showAlert === 'function') {
                showAlert(`Failed to disable addon: ${error.error}`, 'error');
            }
        }
    } catch (error) {
        if (typeof showAlert === 'function') {
            showAlert(`Disable error: ${error.message}`, 'error');
        }
    }
}

// Configure addon (called from settings)
async function configureAddon(addonName) {
    try {
        console.log('⚙️ Configuring addon:', addonName);
        
        // Load addon settings and schema
        const response = await fetch(`/addons/${addonName}/settings`);
        if (!response.ok) {
            throw new Error('Failed to load addon settings');
        }
        
        const addonData = await response.json();
        currentAddonConfig = {
            name: addonName,
            settings: addonData.settings,
            schema: addonData.schema
        };
        
        // Show configuration modal
        showAddonConfigModal(addonName, addonData.schema, addonData.settings);
        
    } catch (error) {
        console.error('Addon configuration error:', error);
        if (typeof showAlert === 'function') {
            showAlert(`Failed to load addon configuration: ${error.message}`, 'error');
        } else {
            alert(`Failed to load addon configuration: ${error.message}`);
        }
    }
}

// Show addon configuration modal
function showAddonConfigModal(addonName, schema, settings) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('addonConfigModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'addonConfigModal';
        modal.className = 'settings-modal';
        modal.innerHTML = `
            <div class="settings-modal-content">
                <div class="settings-modal-header">
                    <h2 id="addonConfigTitle">Configure Addon</h2>
                    <button class="settings-close-btn" onclick="closeAddonConfig()">×</button>
                </div>
                <div class="settings-modal-body">
                    <div class="settings-content" id="addonConfigBody">
                        <!-- Auto-generated content -->
                    </div>
                </div>
                <div class="settings-modal-footer">
                    <button class="btn" onclick="closeAddonConfig()">Cancel</button>
                    <button class="btn btn-success" onclick="saveAddonConfig()">Save Settings</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAddonConfig();
            }
        });
    }
    
    // Populate modal
    const title = document.getElementById('addonConfigTitle');
    const body = document.getElementById('addonConfigBody');
    
    title.textContent = `Configure ${schema.title || addonName}`;
    body.innerHTML = generateAddonConfigForm(schema, settings);
    
    modal.classList.add('active');
    modal.dataset.addonName = addonName;
}

// Generate configuration form
function generateAddonConfigForm(schema, settings) {
    if (!schema.sections) {
        return '<p>No configuration options available for this addon.</p>';
    }
    
    let html = '';
    if (schema.description) {
        html += `<div class="settings-section-description">${schema.description}</div>`;
    }
    
    schema.sections.forEach(section => {
        html += `
            <div class="settings-section">
                <div class="settings-section-title">${section.title}</div>
                ${section.fields.map(field => generateConfigField(field, settings)).join('')}
            </div>
        `;
    });
    
    return html;
}

// Generate individual config field
function generateConfigField(field, settings) {
    const value = settings[field.name] || '';
    const fieldId = `config_${field.name}`;
    
    let fieldHtml = '';
    
    switch (field.type) {
        case 'checkbox':
            fieldHtml = `
                <div class="settings-form-group">
                    <label>
                        <input type="checkbox" id="${fieldId}" ${value ? 'checked' : ''}>
                        ${field.label}
                    </label>
                    <div class="help-text">${field.description}</div>
                </div>
            `;
            break;
        case 'select':
            fieldHtml = `
                <div class="settings-form-group">
                    <label for="${fieldId}">${field.label}</label>
                    <select id="${fieldId}">
                        ${field.options.map(option => 
                            `<option value="${option.value}" ${value === option.value ? 'selected' : ''}>${option.label}</option>`
                        ).join('')}
                    </select>
                    <div class="help-text">${field.description}</div>
                </div>
            `;
            break;
        case 'number':
            fieldHtml = `
                <div class="settings-form-group">
                    <label for="${fieldId}">${field.label}</label>
                    <input type="number" id="${fieldId}" value="${value}" 
                           min="${field.min || ''}" max="${field.max || ''}" 
                           placeholder="${field.placeholder || ''}">
                    <div class="help-text">${field.description}</div>
                </div>
            `;
            break;
        case 'color':
            fieldHtml = `
                <div class="settings-form-group">
                    <label for="${fieldId}">${field.label}</label>
                    <input type="color" id="${fieldId}" value="${value || '#4a4a4a'}">
                    <div class="help-text">${field.description}</div>
                </div>
            `;
            break;
        default: // text
            fieldHtml = `
                <div class="settings-form-group">
                    <label for="${fieldId}">${field.label}</label>
                    <input type="text" id="${fieldId}" value="${value}" 
                           placeholder="${field.placeholder || ''}">
                    <div class="help-text">${field.description}</div>
                </div>
            `;
    }
    
    return fieldHtml;
}

// Save addon configuration
async function saveAddonConfig() {
    const modal = document.getElementById('addonConfigModal');
    const addonName = modal.dataset.addonName;
    
    if (!currentAddonConfig) {
        console.error('No addon config data available');
        return;
    }
    
    try {
        // Collect form data
        const formData = {};
        const fields = modal.querySelectorAll('[id^="config_"]');
        
        fields.forEach(field => {
            const fieldName = field.id.replace('config_', '');
            if (field.type === 'checkbox') {
                formData[fieldName] = field.checked;
            } else {
                formData[fieldName] = field.value;
            }
        });
        
        console.log('Saving addon config:', formData);
        
        // Save to backend
        const response = await fetch(`/addons/${addonName}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            if (typeof showAlert === 'function') {
                showAlert('Addon settings saved successfully!', 'success');
            } else {
                alert('Addon settings saved successfully!');
            }
            
            if (typeof addConsoleMessage === 'function') {
                addConsoleMessage(`Addon ${addonName} settings saved`, 'success');
            }
            
            closeAddonConfig();
            
            // Reload addons to apply changes
            setTimeout(() => {
                if (typeof refreshAddons === 'function') {
                    refreshAddons();
                }
            }, 500);
            
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save settings');
        }
        
    } catch (error) {
        console.error('Save addon config error:', error);
        if (typeof showAlert === 'function') {
            showAlert(`Failed to save settings: ${error.message}`, 'error');
        } else {
            alert(`Failed to save settings: ${error.message}`);
        }
    }
}

// Close addon configuration modal
function closeAddonConfig() {
    const modal = document.getElementById('addonConfigModal');
    if (modal) {
        modal.classList.remove('active');
    }
    currentAddonConfig = null;
}

// ==================== UTILITY FUNCTIONS ====================

// Utility functions
function getAddonIcon(type) {
    const icons = {
        'toolbar': '🔧',
        'card': '📱', 
        'api': '🔌',
        'background': '⚙️'
    };
    return icons[type] || '🧩';
}

function selectTheme(themeName) {
    currentSettings.theme = themeName;
    
    // Update UI
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('selected');
    });
    const selectedOption = document.querySelector(`[onclick="selectTheme('${themeName}')"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    if (typeof addConsoleMessage === 'function') {
        addConsoleMessage(`Theme changed to: ${themeName}`, 'info');
    }
}

function toggleCustomPort() {
    const serialPort = document.getElementById('serialPort');
    const customGroup = document.getElementById('customPortGroup');
    
    if (serialPort && customGroup) {
        customGroup.style.display = serialPort.value === 'custom' ? 'block' : 'none';
    }
}

// ==================== SETTINGS MANAGEMENT ====================

async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        if (response.ok) {
            currentSettings = await response.json();
        } else {
            currentSettings = getDefaultSettings();
        }
    } catch (error) {
        console.debug('Settings not available, using defaults');
        currentSettings = getDefaultSettings();
    }
}

function getDefaultSettings() {
    return {
        enableCamera: true,
        cameraStreamUrl: '', // Will be dynamically loaded from /api/camera/config
        autoConnect: false,
        enableNotifications: true,
        updateInterval: 3,
        maxConsoleLines: 50,
        maxFiles: 50,
        maxFileAge: 30,
        autoCleanup: false,
        allowedExtensions: '.ctb,.cbddlp,.pwmx,.pwmo,.pwms,.pws,.pw0,.pwx',
        serialPort: '/dev/serial0',
        baudRate: 115200,
        timeout: 5,
        retryAttempts: 3,
        zSpeed: 600,
        homeSpeed: 300,
        customMovements: '0.1,1,5,10',
        customSerialPort: '',
        theme: 'dark',
        compactMode: false,
        showAnimations: true,
        showToolbar: true,
        showConsole: true,
        showStatusBar: true,
        showPrintingOverlay: true,
        autoPauseOnError: false,
        showPrintStats: true,
        defaultView: 'dashboard',
        customCSS: ''
    };
}

function collectCurrentSettings() {
    const settings = {};
    
    // General settings
    const checkboxes = [
        'enableCamera', 'autoConnect', 'enableNotifications', 'autoCleanup', 
        'compactMode', 'showAnimations', 'showToolbar', 'showConsole', 
        'showStatusBar', 'showPrintingOverlay', 'autoPauseOnError', 'showPrintStats'
    ];
    
    checkboxes.forEach(id => {
        const element = document.getElementById(id);
        if (element) settings[id] = element.checked;
    });
    
    const inputs = [
        'cameraStreamUrl', 'updateInterval', 'maxConsoleLines', 'maxFiles', 'maxFileAge', 
        'allowedExtensions', 'serialPort', 'baudRate', 'timeout', 
        'retryAttempts', 'zSpeed', 'homeSpeed', 'customMovements', 
        'customSerialPort', 'defaultView', 'customCSS'
    ];
    
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) settings[id] = element.value;
    });
    
    settings.theme = currentSettings.theme;
    
    return settings;
}

async function saveSettings() {
    try {
        const settings = collectCurrentSettings();
        
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            currentSettings = settings;
            
            // Update main app settings if the function exists
            if (typeof window.updateAppSettings === 'function') {
                window.updateAppSettings(settings);
            }
            
            // Update camera stream URL if changed
            if (typeof window.updateCameraStreamUrl === 'function' && settings.cameraStreamUrl) {
                window.updateCameraStreamUrl(settings.cameraStreamUrl);
            }
            
            // Update camera visibility if changed
            if (typeof window.updateCameraVisibility === 'function') {
                window.updateCameraVisibility();
            }
            
            if (typeof showAlert === 'function') {
                showAlert('Settings saved successfully!', 'success');
            } else {
                alert('Settings saved successfully!');
            }
            
            if (typeof addConsoleMessage === 'function') {
                addConsoleMessage('Settings saved', 'success');
            }
            
            applySettings(settings);
            closeSettings();
        } else {
            if (typeof showAlert === 'function') {
                showAlert('Failed to save settings', 'error');
            } else {
                alert('Failed to save settings');
            }
        }
    } catch (error) {
        if (typeof showAlert === 'function') {
            showAlert(`Settings save error: ${error.message}`, 'error');
        } else {
            alert(`Settings save error: ${error.message}`);
        }
    }
}

function applySettings(settings) {
    if (settings.theme && settings.theme !== 'dark') {
        document.body.className = `theme-${settings.theme}`;
    } else {
        document.body.className = '';
    }
    
    if (!settings.showAnimations) {
        document.body.style.setProperty('--animation-duration', '0s');
    } else {
        document.body.style.removeProperty('--animation-duration');
    }
    
    if (settings.customCSS) {
        let customStyle = document.getElementById('customUserCSS');
        if (!customStyle) {
            customStyle = document.createElement('style');
            customStyle.id = 'customUserCSS';
            document.head.appendChild(customStyle);
        }
        customStyle.textContent = settings.customCSS;
    }
    
    if (window.updateInterval && settings.updateInterval !== currentSettings.updateInterval) {
        clearInterval(window.updateInterval);
        if (typeof updateStatus === 'function' && typeof checkUSB === 'function') {
            window.updateInterval = setInterval(() => {
                updateStatus();
                checkUSB();
            }, (settings.updateInterval || 3) * 1000);
        }
    }
}

async function resetToDefaults() {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/settings/reset', {
            method: 'POST'
        });
        
        if (response.ok) {
            currentSettings = getDefaultSettings();
            if (typeof showAlert === 'function') {
                showAlert('Settings reset to defaults', 'success');
            } else {
                alert('Settings reset to defaults');
            }
            
            if (typeof addConsoleMessage === 'function') {
                addConsoleMessage('Settings reset to defaults', 'success');
            }
            
            loadSettingsTabContent(currentSettingsTab);
            applySettings(currentSettings);
        } else {
            if (typeof showAlert === 'function') {
                showAlert('Failed to reset settings', 'error');
            } else {
                alert('Failed to reset settings');
            }
        }
    } catch (error) {
        if (typeof showAlert === 'function') {
            showAlert(`Reset error: ${error.message}`, 'error');
        } else {
            alert(`Reset error: ${error.message}`);
        }
        
        if (typeof addConsoleMessage === 'function') {
            addConsoleMessage(`Reset error: ${error.message}`, 'error');
        }
    }
}

// ==================== EVENT HANDLERS ====================

// Close modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('settingsModal');
    if (modal && modal.classList.contains('active') && e.target === modal) {
        closeSettings();
    }
});

// Keyboard shortcuts for settings
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        openSettings();
    }
    
    if (e.key === 'Escape') {
        const settingsModal = document.getElementById('settingsModal');
        const addonConfigModal = document.getElementById('addonConfigModal');
        
        if (addonConfigModal && addonConfigModal.classList.contains('active')) {
            closeAddonConfig();
        } else if (settingsModal && settingsModal.classList.contains('active')) {
            closeSettings();
        }
    }
});

// ==================== GLOBAL EXPORTS ====================

// Make functions globally available
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.switchSettingsTab = switchSettingsTab;
window.saveSettings = saveSettings;
window.resetToDefaults = resetToDefaults;
window.selectTheme = selectTheme;
window.toggleCustomPort = toggleCustomPort;
window.configureAddon = configureAddon;
window.closeAddonConfig = closeAddonConfig;
window.saveAddonConfig = saveAddonConfig;
window.setupAddonInstallation = setupAddonInstallation;
window.triggerAddonUpload = triggerAddonUpload;
window.handleAddonFiles = handleAddonFiles;
window.refreshAddonList = refreshAddonList;
window.enableAddon = enableAddon;
window.disableAddon = disableAddon;

// FIXED: Use the new filesystem removal functions
window.removeAddon = removeAddonFixed;  // Use the FIXED version
window.forceRemoveAddon = forceRemoveAddonFixed;  // Use the FIXED version
window.removeAddonFixed = removeAddonFixed;
window.forceRemoveAddonFixed = forceRemoveAddonFixed;
window.debugAddonDirectories = debugAddonDirectories;

// Initialize settings system
window.addEventListener('load', () => {
    console.log('✅ Complete settings system with FIXED addon removal loaded');
    console.log('🗑️ Addon removal now deletes files from filesystem!');
});