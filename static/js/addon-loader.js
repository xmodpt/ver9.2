/**
 * SELF-CONTAINED ADDON LOADER
 * This script is completely independent and auto-loads itself
 * The main app has ZERO knowledge of this file
 */

(function() {
    'use strict';
    
    console.log('🧩 Self-contained addon loader starting...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAddonSystem);
    } else {
        initializeAddonSystem();
    }
    
    function initializeAddonSystem() {
        console.log('🔧 Initializing self-contained addon system...');
        
        // Load Font Awesome for addon icons
        loadFontAwesome();
        
        // Wait a bit for main app to finish loading, then load addons
        setTimeout(() => {
            loadAllAddons();
        }, 1000);
    }
    
    function loadFontAwesome() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(link);
            console.log('📚 Font Awesome loaded for addon icons');
        }
    }
    
    async function loadAllAddons() {
        try {
            console.log('🔄 Loading all addons...');
            
            // Load toolbar addons
            await loadToolbarAddons();
            
            // Load card addons
            await loadCardAddons();
            
            console.log('✅ All addons loaded successfully');
            
        } catch (error) {
            console.log('ℹ️ Addon loading completed with some issues:', error.message);
        }
    }
    
    async function loadToolbarAddons() {
        try {
            console.log('🔧 Loading toolbar addons...');
            
            const response = await fetch('/addons/toolbar_items');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const toolbarItems = await response.json();
            
            if (toolbarItems && toolbarItems.length > 0) {
                integrateToolbarItems(toolbarItems);
                console.log(`✅ Loaded ${toolbarItems.length} toolbar addon(s)`);
            } else {
                console.log('ℹ️ No toolbar addons found');
            }
            
        } catch (error) {
            console.log('ℹ️ No toolbar addons available:', error.message);
        }
    }
    
    function integrateToolbarItems(toolbarItems) {
        const toolbarContainer = document.getElementById('toolbarAddonItems');
        if (!toolbarContainer) {
            console.warn('⚠️ Toolbar addon container (#toolbarAddonItems) not found in DOM');
            return;
        }
        
        // Clear existing content
        toolbarContainer.innerHTML = '';
        
        toolbarItems.forEach((item, index) => {
            try {
                console.log(`🔧 Adding toolbar item: ${item.label}`);
                
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
                        button.setAttribute(`data-${key}`, String(value));
                    });
                }
                
                // Setup click handler
                button.onclick = function() {
                    console.log(`🖱️ Toolbar addon clicked: ${item.action}`);
                    
                    if (item.action && typeof window[item.action] === 'function') {
                        try {
                            window[item.action](item.data || {});
                        } catch (error) {
                            console.error(`Error executing addon action ${item.action}:`, error);
                            if (typeof window.showAlert === 'function') {
                                window.showAlert(`Addon error: ${error.message}`, 'error');
                            }
                        }
                    } else {
                        console.warn(`❌ Addon action function not found: ${item.action}`);
                        if (typeof window.showAlert === 'function') {
                            window.showAlert(`Addon function "${item.action}" not available`, 'warning');
                        } else {
                            alert(`Addon function "${item.action}" not available`);
                        }
                    }
                };
                
                toolbarContainer.appendChild(button);
                console.log(`✅ Added toolbar item: ${item.label}`);
                
            } catch (error) {
                console.error(`❌ Failed to add toolbar item ${index}:`, error);
            }
        });
    }
    
    async function loadCardAddons() {
        try {
            console.log('📱 Loading card addons...');
            
            const response = await fetch('/addons/cards');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const cardAddons = await response.json();
            
            if (cardAddons && cardAddons.length > 0) {
                integrateCardAddons(cardAddons);
                console.log(`✅ Loaded ${cardAddons.length} card addon(s)`);
            } else {
                console.log('ℹ️ No card addons found');
            }
            
        } catch (error) {
            console.log('ℹ️ No card addons available:', error.message);
        }
    }
    
    function integrateCardAddons(cardAddons) {
        console.log('ℹ️ Card addons disabled - container removed');
        return;
    }
    
    // Make refresh function globally available for settings
    window.refreshAddons = function() {
        console.log('🔄 Refreshing all addons...');
        loadAllAddons();
    };
    
    // Auto-refresh when addons are installed/configured
    window.addEventListener('addonInstalled', function() {
        console.log('🔄 Addon installed, refreshing...');
        setTimeout(loadAllAddons, 1000);
    });
    
    window.addEventListener('addonConfigured', function() {
        console.log('🔄 Addon configure 
