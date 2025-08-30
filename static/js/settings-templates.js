/**
 * Settings Tab Templates - WITH CAMERA SETTINGS
 * Contains HTML templates for different settings sections including camera
 */

const SettingsTemplates = {
    
    general: (settings) => `
        <div class="settings-section">
            <div class="settings-section-title">
                🔧 Application Settings
            </div>
            <div class="settings-section-description">
                Configure general application behavior and preferences.
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="enableWebcam" ${settings.enableWebcam ? 'checked' : ''}>
                    Enable Camera/Webcam
                </label>
                <div class="help-text">Enable camera streaming and photo capture functionality</div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="autoStartCamera" ${settings.autoStartCamera ? 'checked' : ''}>
                    Auto-Start Camera
                </label>
                <div class="help-text">Automatically start camera when application loads</div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="autoConnect" ${settings.autoConnect ? 'checked' : ''}>
                    Auto-connect to Printer
                </label>
                <div class="help-text">Automatically connect to printer on startup</div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="enableNotifications" ${settings.enableNotifications ? 'checked' : ''}>
                    Enable Notifications
                </label>
                <div class="help-text">Show browser notifications for print events</div>
            </div>
            
            <div class="settings-form-row">
                <div class="settings-form-group">
                    <label for="updateInterval">Status Update Interval (seconds)</label>
                    <input type="number" id="updateInterval" value="${settings.updateInterval || 3}" min="1" max="30">
                    <div class="help-text">How often to check printer status</div>
                </div>
                
                <div class="settings-form-group">
                    <label for="maxConsoleLines">Console History Lines</label>
                    <input type="number" id="maxConsoleLines" value="${settings.maxConsoleLines || 50}" min="10" max="500">
                    <div class="help-text">Maximum console messages to keep</div>
                </div>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="settings-section-title">
                📷 External Camera Settings
            </div>
            <div class="settings-section-description">
                Configure external camera stream settings.
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="enableCamera" ${settings.enableCamera !== false ? 'checked' : ''}>
                    Enable Camera
                </label>
                <div class="help-text">Show camera stream in the main interface</div>
            </div>
            
            <div class="settings-form-group">
                <label for="cameraStreamUrl">Camera Stream URL</label>
                <input type="text" id="cameraStreamUrl" 
                               value="${settings.cameraStreamUrl || ''}"
        placeholder="Camera URL will be auto-detected">
                <div class="help-text">Complete URL to your external MJPEG camera stream</div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="fullscreenWebcam" ${settings.fullscreenWebcam !== false ? 'checked' : ''}>
                    Click for Fullscreen
                </label>
                <div class="help-text">Allow clicking camera to enter fullscreen mode</div>
            </div>
            
            <div class="settings-form-group">
                <button type="button" class="btn btn-primary" onclick="testCameraStream()">
                    📹 Test Camera Stream
                </button>
                <div class="help-text">Test the external camera stream connection</div>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="settings-section-title">
                💾 File Management
            </div>
            <div class="settings-section-description">
                Configure file handling and storage options.
            </div>
            
            <div class="settings-form-row">
                <div class="settings-form-group">
                    <label for="maxFiles">Maximum Files to Keep</label>
                    <input type="number" id="maxFiles" value="${settings.maxFiles || 50}" min="10" max="200">
                    <div class="help-text">Auto-cleanup will keep this many files</div>
                </div>
                
                <div class="settings-form-group">
                    <label for="maxFileAge">Maximum File Age (days)</label>
                    <input type="number" id="maxFileAge" value="${settings.maxFileAge || 30}" min="1" max="365">
                    <div class="help-text">Auto-cleanup removes files older than this</div>
                </div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="autoCleanup" ${settings.autoCleanup ? 'checked' : ''}>
                    Enable Auto-cleanup
                </label>
                <div class="help-text">Automatically remove old files based on settings above</div>
            </div>
            
            <div class="settings-form-group">
                <label for="allowedExtensions">Allowed File Extensions</label>
                <input type="text" id="allowedExtensions" value="${settings.allowedExtensions || '.ctb,.cbddlp,.pwmx,.pwmo,.pwms,.pws,.pw0,.pwx'}">
                <div class="help-text">Comma-separated list of allowed file extensions</div>
            </div>
        </div>
    `,
    
    printer: (settings) => `
        <div class="settings-section">
            <div class="settings-section-title">
                🖨️ Printer Connection
            </div>
            <div class="settings-section-description">
                Configure printer communication settings.
            </div>
            
            <div class="settings-form-row">
                <div class="settings-form-group">
                    <label for="serialPort">Serial Port</label>
                    <select id="serialPort" onchange="toggleCustomPort()">
                        <option value="/dev/serial0" ${settings.serialPort === '/dev/serial0' ? 'selected' : ''}>/dev/serial0 (Default)</option>
                        <option value="/dev/ttyUSB0" ${settings.serialPort === '/dev/ttyUSB0' ? 'selected' : ''}>/dev/ttyUSB0</option>
                        <option value="/dev/ttyACM0" ${settings.serialPort === '/dev/ttyACM0' ? 'selected' : ''}>/dev/ttyACM0</option>
                        <option value="custom" ${settings.serialPort === 'custom' ? 'selected' : ''}>Custom Port</option>
                    </select>
                    <div class="help-text">Serial port for printer communication</div>
                </div>
                
                <div class="settings-form-group">
                    <label for="baudRate">Baud Rate</label>
                    <select id="baudRate">
                        <option value="9600" ${settings.baudRate == 9600 ? 'selected' : ''}>9600</option>
                        <option value="115200" ${settings.baudRate == 115200 ? 'selected' : ''}>115200 (Default)</option>
                        <option value="250000" ${settings.baudRate == 250000 ? 'selected' : ''}>250000</option>
                    </select>
                    <div class="help-text">Communication speed</div>
                </div>
            </div>
            
            <div class="settings-form-group" id="customPortGroup" style="display: ${settings.serialPort === 'custom' ? 'block' : 'none'};">
                <label for="customSerialPort">Custom Serial Port</label>
                <input type="text" id="customSerialPort" value="${settings.customSerialPort || ''}" placeholder="/dev/ttyXXX">
                <div class="help-text">Enter custom serial port path</div>
            </div>
            
            <div class="settings-form-row">
                <div class="settings-form-group">
                    <label for="timeout">Communication Timeout (seconds)</label>
                    <input type="number" id="timeout" value="${settings.timeout || 5}" min="1" max="30" step="0.5">
                    <div class="help-text">Timeout for printer commands</div>
                </div>
                
                <div class="settings-form-group">
                    <label for="retryAttempts">Retry Attempts</label>
                    <input type="number" id="retryAttempts" value="${settings.retryAttempts || 3}" min="1" max="10">
                    <div class="help-text">Number of retries for failed commands</div>
                </div>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="settings-section-title">
                🎮 Movement Settings
            </div>
            <div class="settings-section-description">
                Configure Z-axis movement and positioning.
            </div>
            
            <div class="settings-form-row">
                <div class="settings-form-group">
                    <label for="zSpeed">Z-Axis Speed (mm/min)</label>
                    <input type="number" id="zSpeed" value="${settings.zSpeed || 600}" min="100" max="2000">
                    <div class="help-text">Speed for Z-axis movements</div>
                </div>
                
                <div class="settings-form-group">
                    <label for="homeSpeed">Homing Speed (mm/min)</label>
                    <input type="number" id="homeSpeed" value="${settings.homeSpeed || 300}" min="50" max="1000">
                    <div class="help-text">Speed for homing operations</div>
                </div>
            </div>
            
            <div class="settings-form-group">
                <label for="customMovements">Custom Movement Buttons</label>
                <input type="text" id="customMovements" value="${settings.customMovements || '0.1,1,5,10'}" placeholder="0.1,1,5,10">
                <div class="help-text">Comma-separated list of movement distances (mm)</div>
            </div>
        </div>
    `,
    
    interface: (settings) => `
        <div class="settings-section">
            <div class="settings-section-title">
                🎨 Theme & Appearance
            </div>
            <div class="settings-section-description">
                Customize the visual appearance of the interface.
            </div>
            
            <div class="settings-form-group">
                <label>Theme</label>
                <div class="theme-selector">
                    <div class="theme-option ${settings.theme === 'dark' ? 'selected' : ''}" onclick="selectTheme('dark')">
                        <div class="theme-preview theme-dark">
                            <div class="color-1"></div>
                            <div class="color-2"></div>
                            <div class="color-3"></div>
                        </div>
                        <div class="theme-name">Dark (Default)</div>
                    </div>
                    
                    <div class="theme-option ${settings.theme === 'blue' ? 'selected' : ''}" onclick="selectTheme('blue')">
                        <div class="theme-preview theme-blue">
                            <div class="color-1"></div>
                            <div class="color-2"></div>
                            <div class="color-3"></div>
                        </div>
                        <div class="theme-name">Blue Ocean</div>
                    </div>
                    
                    <div class="theme-option ${settings.theme === 'green' ? 'selected' : ''}" onclick="selectTheme('green')">
                        <div class="theme-preview theme-green">
                            <div class="color-1"></div>
                            <div class="color-2"></div>
                            <div class="color-3"></div>
                        </div>
                        <div class="theme-name">Forest Green</div>
                    </div>
                    
                    <div class="theme-option ${settings.theme === 'purple' ? 'selected' : ''}" onclick="selectTheme('purple')">
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
                    <input type="checkbox" id="compactMode" ${settings.compactMode ? 'checked' : ''}>
                    Compact Mode
                </label>
                <div class="help-text">Reduce spacing and use smaller elements</div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="showAnimations" ${settings.showAnimations !== false ? 'checked' : ''}>
                    Enable Animations
                </label>
                <div class="help-text">Show smooth transitions and hover effects</div>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="settings-section-title">
                📱 Layout Options
            </div>
            <div class="settings-section-description">
                Configure interface layout and display options.
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="showToolbar" ${settings.showToolbar !== false ? 'checked' : ''}>
                    Show Toolbar
                </label>
                <div class="help-text">Display the top toolbar with quick actions</div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="showConsole" ${settings.showConsole !== false ? 'checked' : ''}>
                    Show Console
                </label>
                <div class="help-text">Display the console events section</div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="showStatusBar" ${settings.showStatusBar !== false ? 'checked' : ''}>
                    Show Status Bar
                </label>
                <div class="help-text">Display the status information at the top</div>
            </div>
            
            <div class="settings-form-group">
                <label>
                    <input type="checkbox" id="showPrintingOverlay" ${settings.showPrintingOverlay !== false ? 'checked' : ''}>
                    Show Printing Overlay
                </label>
                <div class="help-text">Display full-screen overlay during printing with progress and controls</div>
            </div>
            
            <div class="settings-form-group">
                <label for="defaultView">Default View</label>
                <select id="defaultView">
                    <option value="dashboard" ${settings.defaultView === 'dashboard' ? 'selected' : ''}>Dashboard (Default)</option>
                    <option value="files" ${settings.defaultView === 'files' ? 'selected' : ''}>File Manager</option>
                    <option value="control" ${settings.defaultView === 'control' ? 'selected' : ''}>Printer Controls</option>
                </select>
                <div class="help-text">Default view when opening the application</div>
            </div>
        </div>
        
        <div class="settings-section">
            <div class="settings-section-title">
                🔧 Advanced Interface
            </div>
            <div class="settings-section-description">
                Advanced customization options for power users.
            </div>
            
            <div class="settings-form-group">
                <label for="customCSS">Custom CSS</label>
                <textarea id="customCSS" rows="6" placeholder="/* Add your custom CSS here */">${settings.customCSS || ''}</textarea>
                <div class="help-text">Add custom CSS to override default styles</div>
            </div>
        </div>
    `,
    
    addons: (addons) => `
        <div class="settings-section">
            <div class="settings-section-title">
                🧩 Addon Manager
            </div>
            <div class="settings-section-description">
                Manage installed addons and install new ones to extend functionality.
            </div>
            
            <div class="addon-manager">
                <div class="addon-list">
                    ${addons.length === 0 ? 
                        '<div class="empty-state">No addons found. Install addons to extend functionality.</div>' :
                        addons.map(addon => `
                            <div class="addon-item">
                                <div class="addon-info">
                                    <div class="addon-name">
                                        ${SettingsTemplates.getAddonIcon(addon.type)} ${addon.name}
                                        <span class="addon-version">v${addon.version}</span>
                                    </div>
                                    <div class="addon-description">${addon.description}</div>
                                    <div class="addon-meta">
                                        <span>By ${addon.author}</span>
                                        <span class="addon-type">${addon.type}</span>
                                        <span class="addon-status ${addon.enabled ? 'enabled' : 'disabled'}">
                                            ${addon.enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>
                                <div class="addon-actions">
                                    ${addon.enabled ? 
                                        `<button class="btn btn-warning" onclick="disableAddon('${addon.name}')">Disable</button>` :
                                        `<button class="btn btn-success" onclick="enableAddon('${addon.name}')">Enable</button>`
                                    }
                                    <button class="btn btn-danger" onclick="removeAddon('${addon.name}')">Remove</button>
                                    ${addon.type === 'card' || addon.type === 'toolbar' ? 
                                        `<button class="btn" onclick="configureAddon('${addon.name}')">Configure</button>` : ''
                                    }
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
                
                <div class="addon-install-section">
                    <h4>Install New Addon</h4>
                    <div class="addon-install-area" id="addonInstallArea" onclick="document.getElementById('addonFileInput').click()">
                        <input type="file" id="addonFileInput" accept=".zip,.py" style="display: none;" onchange="installAddonFiles(this.files)">
                        <div class="addon-install-icon">📦</div>
                        <div class="addon-install-text">Drop addon files here or click to browse</div>
                        <div class="addon-install-hint">Supports .zip archives and .py files</div>
                    </div>
                    <div class="btn-group">
                        <button class="btn" onclick="browseAddonMarketplace()">🏪 Browse Marketplace</button>
                        <button class="btn btn-success" onclick="createNewAddon()">➕ Create New</button>
                        <button class="btn btn-warning" onclick="exportSettings()">📤 Export Config</button>
                        <button class="btn" onclick="importSettings()">📥 Import Config</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    
    getAddonIcon: (type) => {
        const icons = {
            'toolbar': '🔧',
            'card': '📱',
            'api': '🔌',
            'background': '⚙️'
        };
        return icons[type] || '🧩';
    }
};

// Additional helper functions
window.toggleCustomPort = function() {
    const serialPort = document.getElementById('serialPort');
    const customGroup = document.getElementById('customPortGroup');
    
    if (serialPort && customGroup) {
        customGroup.style.display = serialPort.value === 'custom' ? 'block' : 'none';
    }
};

// Camera settings test function
window.testCameraSettings = function() {
    if (typeof checkCameraStatus === 'function') {
        checkCameraStatus();
        if (typeof showAlert === 'function') {
            showAlert('Camera status checked - see console for details', 'info');
        }
    } else {
        if (typeof showAlert === 'function') {
            showAlert('Camera system not loaded', 'warning');
        }
    }
};

window.exportSettings = async function() {
    try {
        const response = await fetch('/api/settings/export');
        const data = await response.json();
        
        // Create downloadable file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `resin-portal-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        showAlert('Settings exported successfully', 'success');
        addConsoleMessage('Settings and addon configuration exported', 'success');
        
    } catch (error) {
        showAlert(`Export error: ${error.message}`, 'error');
        addConsoleMessage(`Export error: ${error.message}`, 'error');
    }
};

window.importSettings = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (!importData.settings) {
                throw new Error('Invalid settings file format');
            }
            
            if (confirm('Import these settings? Current settings will be overwritten.')) {
                const response = await fetch('/api/settings/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(importData)
                });
                
                if (response.ok) {
                    showAlert('Settings imported successfully', 'success');
                    addConsoleMessage('Settings imported from file', 'success');
                    
                    // Reload settings
                    await loadSettings();
                    loadSettingsTabContent(currentSettingsTab);
                } else {
                    const error = await response.json();
                    throw new Error(error.error || 'Import failed');
                }
            }
            
        } catch (error) {
            showAlert(`Import error: ${error.message}`, 'error');
            addConsoleMessage(`Import error: ${error.message}`, 'error');
        }
    };
    
    input.click();
};