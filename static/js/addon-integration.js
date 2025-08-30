/**
 * Addon Integration JavaScript
 * Add this to your existing app.js or load it separately
 */

// Global addon configuration state
let currentAddonConfig = null;

// Auto-load addons on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🧩 Loading addon integration...');
    
    // Load Font Awesome for addon icons
    loadFontAwesome();
    
    // Auto-load addons
    setTimeout(() => {
        loadAddons();
    }, 1000);
});

// Load Font Awesome for addon icons
function loadFontAwesome() {
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(link);
        console.log('📚 Font Awesome loaded for addon icons');
    }
}

// Auto-load all addons
async function loadAddons() {
    try {
        console.log('🔄 Auto-loading addons...');
        
        // Load toolbar addons
        await loadToolbarAddons();
        
        // Load card addons
        await loadCardAddons();
        
        console.log('✅ Addons loaded successfully');
        
    } catch (error) {
        console.log('ℹ️ No addons available or error loading:', error.message);
    }
}

// Load toolbar addons
async function loadToolbarAddons() {
    try {
        const response = await fetch('/addons/toolbar_items');
        const toolbarItems = await response.json();
        
        if (toolbarItems && toolbarItems.length > 0) {
            loadToolbarItems(toolbarItems);
            console.log(`🔧 Loaded ${toolbarItems.length} toolbar addon(s)`);
        }
        
    } catch (error) {
        console.debug('No toolbar addons available:', error);
    }
}

// Integrate toolbar items
function loadToolbarItems(toolbarItems) {
    const toolbarContainer = document.getElementById('toolbarAddonItems');
    if (!toolbarContainer) {
        console.warn('Toolbar addon container not found');
        return;
    }
    
    toolbarContainer.innerHTML = '';
    
    toolbarItems.forEach(item => {
        const button = document.createElement('button');
        button.className = `toolbar-btn ${item.class || ''}`;
        
        // Setup icon
        let iconHtml = '';
        if (item.icon) {
            if (item.icon.startsWith('fas ') || item.icon.startsWith('far ') || item.icon.startsWith('fab ')) {
                iconHtml = `<i class="${item.icon}"></i> `;
            } else {
                iconHtml = `${item.icon} `;
            }
        }
        
        button.innerHTML = `${iconHtml}${item.label}`;
        button.title = item.tooltip || item.label;
        
        // Setup data attributes
        if (item.data) {
            Object.entries(item.data).forEach(([key, value]) => {
                button.setAttribute(`data-${key}`, value);
            });
        }
        
        // Setup click handler
        button.onclick = () => {
            if (item.action && typeof window[item.action] === 'function') {
                window[item.action](item.data);
            } else {
                console.warn(`Addon action not found: ${item.action}`);
                if (typeof showAlert === 'function') {
                    showAlert(`Addon function "${item.action}" not available`, 'warning');
                }
            }
        };
        
        toolbarContainer.appendChild(button);
    });
}

// Load card addons
async function loadCardAddons() {
    try {
        const response = await fetch('/addons/cards');
        const cardAddons = await response.json();
        
        if (cardAddons && cardAddons.length > 0) {
            loadCardItems(cardAddons);
            console.log(`📱 Loaded ${cardAddons.length} card addon(s)`);
        }
        
    } catch (error) {
        console.debug('No card addons available:', error);
    }
}

// Integrate card items - disabled since container removed
function loadCardItems(cardAddons) {
    console.log('ℹ️ Card addons disabled - container removed');
    return;
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
                loadAddons();
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

// Refresh addons (called after settings changes)
async function refreshAddons() {
    console.log('🔄 Refreshing addons...');
    await loadAddons();
}

// Make functions globally available
window.configureAddon = configureAddon;
window.closeAddonConfig = closeAddonConfig;
window.saveAddonConfig = saveAddonConfig;
window.refreshAddons = refreshAddons;
window.loadAddons = loadAddons;

console.log('✅ Addon integration JavaScript loaded'); 
