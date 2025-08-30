#!/usr/bin/env python3
"""
Relay Controller Addon - GPIO Relay Control for Raspberry Pi - FIXED CSS VERSION
FIXED: CSS no longer interferes with other addon toolbar buttons
"""

import logging
from flask import Blueprint, jsonify, request
from addon_system import BaseAddon, AddonType

try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except ImportError:
    GPIO_AVAILABLE = False

logger = logging.getLogger(__name__)

class Addon(BaseAddon):
    """Relay Controller addon for GPIO relay management - FIXED CSS VERSION"""
    
    def __init__(self):
        super().__init__()
        self.info.addon_type = AddonType.CARD  # Keep as CARD type so JavaScript loads
        self.relay_states = {}
        self.gpio_initialized = False
        # Don't initialize GPIO here - settings may not be loaded yet
    
    def get_default_settings(self):
        return {
            # Global icon settings
            'icon_size': 'medium',
            'show_button_labels': False,
            # Individual relay settings
            'relay_1_enabled': True,
            'relay_1_gpio': 22,
            'relay_1_behavior': 'NO',
            'relay_1_name': 'Light',
            'relay_1_icon': 'fas fa-lightbulb',
            'relay_1_invert_logic': True,
            'relay_2_enabled': True,
            'relay_2_gpio': 23,
            'relay_2_behavior': 'NO',
            'relay_2_name': 'Fan',
            'relay_2_icon': 'fas fa-fan',
            'relay_2_invert_logic': False,
            'relay_3_enabled': True,
            'relay_3_gpio': 24,
            'relay_3_behavior': 'NO',
            'relay_3_name': 'Printer Power',
            'relay_3_icon': 'fas fa-power-off',
            'relay_3_invert_logic': False,
            'relay_4_enabled': True,
            'relay_4_gpio': 25,
            'relay_4_behavior': 'NO',
            'relay_4_name': 'Relay 4',
            'relay_4_icon': 'fas fa-power-off',
            'relay_4_invert_logic': False
        }
    
    def get_settings_schema(self):
        icon_options = [
            {'value': 'fas fa-lightbulb', 'label': '💡 Light Bulb'},
            {'value': 'fas fa-fan', 'label': '🌀 Fan'},
            {'value': 'fas fa-plug', 'label': '🔌 Plug'},
            {'value': 'fas fa-power-off', 'label': '⚡ Power'},
            {'value': 'fas fa-shower', 'label': '🚿 Water/Pump'},
            {'value': 'fas fa-fire', 'label': '🔥 Heater'},
            {'value': 'fas fa-camera', 'label': '📷 Camera'},
            {'value': 'fas fa-bell', 'label': '🔔 Alarm'}
        ]
        
        behavior_options = [
            {'value': 'NO', 'label': 'NO (Normally Open) - Starts OFF, GPIO HIGH = ON'},
            {'value': 'NC', 'label': 'NC (Normally Closed) - Starts ON, GPIO LOW = ON'}
        ]
        
        sections = [
            {
                'title': 'Global Icon Settings',
                'fields': [
                    {
                        'name': 'icon_size',
                        'type': 'select',
                        'label': 'Icon Size',
                        'description': 'Size of relay toolbar buttons',
                        'options': [
                            {'value': 'small', 'label': 'Small (30x30px)'},
                            {'value': 'medium', 'label': 'Medium (35x35px) - Default'},
                            {'value': 'large', 'label': 'Large (40x40px)'}
                        ]
                    },
                    {
                        'name': 'show_button_labels',
                        'type': 'checkbox',
                        'label': 'Show Button Labels',
                        'description': 'Display relay names next to icons in toolbar buttons'
                    }
                ]
            }
        ]
        
        # Add relay configuration sections
        for i in range(1, 5):
            relay_section = {
                'title': f'Relay {i} Configuration',
                'fields': [
                    {
                        'name': f'relay_{i}_enabled',
                        'type': 'checkbox',
                        'label': f'Enable Relay {i}',
                        'description': f'Enable/disable relay {i}'
                    },
                    {
                        'name': f'relay_{i}_name',
                        'type': 'text',
                        'label': 'Relay Name',
                        'description': 'Display name for this relay'
                    },
                    {
                        'name': f'relay_{i}_icon',
                        'type': 'select',
                        'label': 'Icon',
                        'options': icon_options
                    },
                    {
                        'name': f'relay_{i}_gpio',
                        'type': 'number',
                        'label': 'GPIO Pin',
                        'description': 'GPIO pin number (1-40)'
                    },
                    {
                        'name': f'relay_{i}_behavior',
                        'type': 'select',
                        'label': 'Relay Behavior',
                        'options': behavior_options
                    },
                    {
                        'name': f'relay_{i}_invert_logic',
                        'type': 'checkbox',
                        'label': 'Invert Display Logic',
                        'description': 'Show opposite state in interface (useful for NC relays)'
                    }
                ]
            }
            sections.append(relay_section)
        
        # Add About section at the end
        about_section = {
            'title': 'About Relay Controller',
            'fields': [
                {
                    'name': 'about_info',
                    'type': 'text',
                    'label': 'Plugin Information',
                    'description': '''
                    🎛️ Relay Controller Addon v1.0.1
                    
                    📝 Description: GPIO relay control for Raspberry Pi with toolbar interface
                    
                    👨‍💻 Developer: Claude (Anthropic AI Assistant)
                    
                    🔧 Features:
                    • 4 configurable GPIO relays
                    • Normally Open (NO) and Normally Closed (NC) support
                    • Invert logic for complex relay configurations
                    • Real-time toolbar buttons with visual feedback
                    • FontAwesome icons for easy identification
                    • FIXED: No longer interferes with other addon buttons
                    
                    📋 GPIO Requirements: RPi.GPIO library
                    
                    💡 Usage: Configure each relay with GPIO pin, name, icon, and behavior. 
                    Toolbar buttons will appear automatically for enabled relays.
                    
                    🔗 Based on original pyrelay.py standalone application
                    ''',
                    'readonly': True
                }
            ]
        }
        sections.append(about_section)
        
        return {
            'title': 'Relay Controller Settings',
            'description': 'Configure GPIO relay control settings',
            'sections': sections
        }
    
    def setup_gpio(self):
        """Initialize GPIO settings"""
        logger.info("Setting up GPIO...")
        logger.info(f"Available settings: {list(self.settings.keys())}")
        
        if not GPIO_AVAILABLE:
            logger.warning("GPIO not available - running in simulation mode")
            # In development mode, set initial states based on behavior
            for i in range(1, 5):
                if self.settings.get(f'relay_{i}_enabled', False):
                    relay_id = f'relay_{i}'
                    behavior = self.settings.get(f'relay_{i}_behavior', 'NO')
                    logger.info(f"Simulating {relay_id} with behavior {behavior}")
                    if behavior == 'NO':
                        self.relay_states[relay_id] = False  # NO starts OFF
                    else:  # NC
                        self.relay_states[relay_id] = True   # NC starts ON
            return
        
        try:
            # Clean up any existing GPIO setup
            try:
                GPIO.cleanup()
            except:
                pass
                
            GPIO.setmode(GPIO.BCM)
            GPIO.setwarnings(False)
            
            relays_configured = 0
            
            for i in range(1, 5):
                relay_enabled = self.settings.get(f'relay_{i}_enabled', False)
                gpio_pin_setting = self.settings.get(f'relay_{i}_gpio', '')
                
                logger.info(f"Relay {i}: enabled={relay_enabled}, gpio_setting={gpio_pin_setting}")
                
                if relay_enabled:
                    # Handle both string and int GPIO values
                    if isinstance(gpio_pin_setting, str):
                        if gpio_pin_setting == '':
                            logger.warning(f"Relay {i} enabled but no GPIO pin configured")
                            continue
                        try:
                            gpio_pin = int(gpio_pin_setting)
                        except ValueError:
                            logger.error(f"Invalid GPIO pin for relay_{i}: {gpio_pin_setting}")
                            continue
                    else:
                        gpio_pin = int(gpio_pin_setting)
                        
                    relay_id = f'relay_{i}'
                    behavior = self.settings.get(f'relay_{i}_behavior', 'NO')
                    relay_name = self.settings.get(f'relay_{i}_name', f'Relay {i}')
                    
                    logger.info(f"Configuring {relay_name} on GPIO pin {gpio_pin} with behavior {behavior}")
                    
                    # Setup pin as output
                    GPIO.setup(gpio_pin, GPIO.OUT)
                    
                    # Set initial state based on behavior
                    if behavior == 'NO':
                        GPIO.output(gpio_pin, GPIO.LOW)  # NO: LOW = OFF
                        self.relay_states[relay_id] = False
                        logger.info(f"  {relay_id} (NO): Initial state OFF (GPIO LOW)")
                    else:  # NC
                        GPIO.output(gpio_pin, GPIO.LOW)  # NC: LOW = ON (relay energized)
                        self.relay_states[relay_id] = True
                        logger.info(f"  {relay_id} (NC): Initial state ON (GPIO LOW)")
                    
                    relays_configured += 1
            
            self.gpio_initialized = True
            logger.info(f"GPIO setup completed - {relays_configured} relays configured")
            logger.info(f"Relay states: {self.relay_states}")
                        
        except Exception as e:
            logger.error(f"Error setting up GPIO: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
    
    def get_display_state(self, relay_id, actual_state):
        """Get the display state based on actual state and invert logic setting"""
        invert_logic = self.settings.get(f'{relay_id}_invert_logic', False)
        if invert_logic:
            return not actual_state
        return actual_state
    
    def set_relay_state(self, relay_id, state):
        """Set relay state based on configuration"""
        relay_num = relay_id.split('_')[1]
        
        if not self.settings.get(f'relay_{relay_num}_enabled', False):
            logger.warning(f"Relay {relay_id} not enabled")
            return False
        
        if not GPIO_AVAILABLE:
            logger.info(f"Development mode: Setting {relay_id} to {'ON' if state else 'OFF'}")
            self.relay_states[relay_id] = state
            return True
        
        try:
            gpio_pin_str = self.settings.get(f'relay_{relay_num}_gpio', '')
            if not gpio_pin_str or gpio_pin_str == '':
                logger.warning(f"No GPIO pin configured for {relay_id}")
                return False
                
            gpio_pin = int(gpio_pin_str)
            behavior = self.settings.get(f'relay_{relay_num}_behavior', 'NO')
            
            # Ensure GPIO is set up properly before use
            try:
                # Check if GPIO mode is set, if not, set it
                GPIO.setmode(GPIO.BCM)
                GPIO.setwarnings(False)
                
                # Check if pin is already set up, if not, set it up
                try:
                    # Try to read the pin setup - this will fail if not set up
                    GPIO.setup(gpio_pin, GPIO.OUT)
                except:
                    # Pin not set up, configure it
                    GPIO.setup(gpio_pin, GPIO.OUT)
                    # Set initial state
                    if behavior == 'NO':
                        GPIO.output(gpio_pin, GPIO.LOW)
                        self.relay_states[relay_id] = False
                    else:
                        GPIO.output(gpio_pin, GPIO.LOW)
                        self.relay_states[relay_id] = True
                    logger.info(f"Set up GPIO pin {gpio_pin} for {relay_id}")
                
            except Exception as setup_error:
                logger.error(f"GPIO setup error for {relay_id}: {setup_error}")
                return False
            
            # Now set the relay state
            if behavior == 'NO':
                # NO (Normally Open): HIGH = ON, LOW = OFF
                gpio_state = GPIO.HIGH if state else GPIO.LOW
                GPIO.output(gpio_pin, gpio_state)
                logger.info(f"NO Relay {relay_id}: Set to {'ON' if state else 'OFF'} (GPIO {'HIGH' if gpio_state else 'LOW'})")
            else:
                # NC (Normally Closed): LOW = ON, HIGH = OFF
                gpio_state = GPIO.LOW if state else GPIO.HIGH
                GPIO.output(gpio_pin, gpio_state)
                logger.info(f"NC Relay {relay_id}: Set to {'ON' if state else 'OFF'} (GPIO {'LOW' if gpio_state == GPIO.LOW else 'HIGH'})")
            
            self.relay_states[relay_id] = state
            return True
            
        except (ValueError, Exception) as e:
            logger.error(f"Error setting relay {relay_id}: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return False
    
    def cleanup_gpio(self):
        """Clean up GPIO resources"""
        if GPIO_AVAILABLE and self.gpio_initialized:
            try:
                logger.info("Cleaning up GPIO...")
                # Turn off all relays before cleanup
                for i in range(1, 5):
                    if self.settings.get(f'relay_{i}_enabled', False):
                        relay_id = f'relay_{i}'
                        self.set_relay_state(relay_id, False)
                
                GPIO.cleanup()
                logger.info("GPIO cleanup completed")
                self.gpio_initialized = False
            except Exception as e:
                logger.error(f"Error during GPIO cleanup: {e}")
    
    def get_toolbar_items(self):
        toolbar_items = []
        for i in range(1, 5):
            if self.settings.get(f'relay_{i}_enabled', False):
                # Check if GPIO pin is configured
                gpio_pin = self.settings.get(f'relay_{i}_gpio', '')
                if not gpio_pin or gpio_pin == '':
                    continue
                    
                relay_id = f'relay_{i}'
                name = self.settings.get(f'relay_{i}_name', f'Relay {i}')
                icon = self.settings.get(f'relay_{i}_icon', 'fas fa-power-off')
                actual_state = self.relay_states.get(relay_id, False)
                display_state = self.get_display_state(relay_id, actual_state)
                
                toolbar_items.append({
                    'label': self.settings.get('show_button_labels', False) and name or '',  # Show label if enabled
                    'icon': icon,
                    'class': f'relay-btn-{i} relay-icon-only',
                    'tooltip': f'{name}: {"ON" if display_state else "OFF"}',
                    'action': 'addonToggleRelay',
                    'data': {'relay_id': relay_id}
                })
        
        return toolbar_items
    
    def get_card_html(self):
        # Return minimal hidden content to ensure JavaScript loads
        return '<div style="display: none;"></div>'
    
    def get_card_javascript(self):
        """Return JavaScript for toolbar functionality - FIXED CSS VERSION"""
        return '''
        // Add CSS for ONLY relay toolbar buttons - FIXED VERSION
        if (!document.getElementById('relayToolbarCSS')) {
            const relayStyle = document.createElement('style');
            relayStyle.id = 'relayToolbarCSS';
            
            // Get icon size setting
            const iconSize = ''' + f"'{self.settings.get('icon_size', 'medium')}'" + ''';
            const showLabels = ''' + str(self.settings.get('show_button_labels', False)).lower() + ''';
            
            // Calculate sizes based on setting
            let buttonSize, fontSize, padding, margin, borderRadius, shadowSize;
            
            switch(iconSize) {
                case 'small':
                    buttonSize = '30px';
                    fontSize = '1.1rem';
                    padding = '5px';
                    margin = '2px';
                    borderRadius = '5px';
                    shadowSize = '10px';
                    break;
                case 'large':
                    buttonSize = '40px';
                    fontSize = '1.4rem';
                    padding = '7px';
                    margin = '4px';
                    borderRadius = '7px';
                    shadowSize = '14px';
                    break;
                default: // medium
                    buttonSize = '35px';
                    fontSize = '1.25rem';
                    padding = '6px';
                    margin = '3px';
                    borderRadius = '6px';
                    shadowSize = '12px';
            }
            
            // Adjust width if labels are shown
            const buttonWidth = showLabels ? 'auto' : buttonSize;
            const minWidth = showLabels ? buttonSize : buttonSize;
            
            relayStyle.textContent = `
                /* FIXED: Only style SPECIFIC relay buttons - don't interfere with other addons */
                .toolbar-btn.relay-btn-1,
                .toolbar-btn.relay-btn-2,
                .toolbar-btn.relay-btn-3,
                .toolbar-btn.relay-btn-4,
                .toolbar-btn.relay-icon-only {
                    width: ${buttonWidth} !important;
                    height: ${buttonSize} !important;
                    font-size: ${fontSize} !important;
                    padding: ${showLabels ? padding + ' 8px' : padding} !important;
                    margin: 0 ${margin} !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    border-radius: ${borderRadius} !important;
                    border-width: 2px !important;
                    min-width: ${minWidth} !important;
                    min-height: ${buttonSize} !important;
                    position: relative !important;
                    gap: ${showLabels ? '6px' : '0'} !important;
                    white-space: nowrap !important;
                    z-index: 5 !important;
                }
                
                /* Relay button ON state - SPECIFIC selectors only */
                .toolbar-btn.relay-btn-1.relay-on,
                .toolbar-btn.relay-btn-2.relay-on,
                .toolbar-btn.relay-btn-3.relay-on,
                .toolbar-btn.relay-btn-4.relay-on {
                    background-color: #1b5e20 !important;
                    border-color: #4caf50 !important;
                    color: #4caf50 !important;
                    box-shadow: 0 0 ${shadowSize} rgba(76, 175, 80, 0.5) !important;
                }
                
                .toolbar-btn.relay-btn-1.relay-on:hover,
                .toolbar-btn.relay-btn-2.relay-on:hover,
                .toolbar-btn.relay-btn-3.relay-on:hover,
                .toolbar-btn.relay-btn-4.relay-on:hover {
                    background-color: #2e7d32 !important;
                    box-shadow: 0 0 ${parseInt(shadowSize) * 1.5}px rgba(76, 175, 80, 0.7) !important;
                    transform: translateY(-1px) scale(1.05) !important;
                }
                
                /* Relay button OFF state - SPECIFIC selectors only */
                .toolbar-btn.relay-btn-1.relay-off,
                .toolbar-btn.relay-btn-2.relay-off,
                .toolbar-btn.relay-btn-3.relay-off,
                .toolbar-btn.relay-btn-4.relay-off {
                    background-color: #4a4a4a !important;
                    border-color: #555 !important;
                    color: #e0e0e0 !important;
                    box-shadow: 0 0 ${parseInt(shadowSize) / 3}px rgba(0, 0, 0, 0.3) !important;
                }
                
                .toolbar-btn.relay-btn-1.relay-off:hover,
                .toolbar-btn.relay-btn-2.relay-off:hover,
                .toolbar-btn.relay-btn-3.relay-off:hover,
                .toolbar-btn.relay-btn-4.relay-off:hover {
                    background-color: #525252 !important;
                    border-color: #666 !important;
                    transform: translateY(-1px) scale(1.05) !important;
                    box-shadow: 0 0 ${parseInt(shadowSize) / 1.5}px rgba(0, 0, 0, 0.4) !important;
                }
                
                /* Transitions - SPECIFIC relay buttons only */
                .toolbar-btn.relay-btn-1,
                .toolbar-btn.relay-btn-2,
                .toolbar-btn.relay-btn-3,
                .toolbar-btn.relay-btn-4 {
                    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
                }
                
                /* Icon styling - SPECIFIC relay buttons only */
                .toolbar-btn.relay-btn-1 i,
                .toolbar-btn.relay-btn-2 i,
                .toolbar-btn.relay-btn-3 i,
                .toolbar-btn.relay-btn-4 i {
                    font-size: ${fontSize} !important;
                    line-height: 1 !important;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
                    flex-shrink: 0 !important;
                }
                
                /* Label styling when shown - SPECIFIC relay buttons only */
                ${showLabels ? `
                .toolbar-btn.relay-btn-1,
                .toolbar-btn.relay-btn-2,
                .toolbar-btn.relay-btn-3,
                .toolbar-btn.relay-btn-4 {
                    font-size: 0.75rem !important;
                    font-weight: 600 !important;
                }
                ` : ''}
                
                /* Active state - SPECIFIC relay buttons only */
                .toolbar-btn.relay-btn-1:active,
                .toolbar-btn.relay-btn-2:active,
                .toolbar-btn.relay-btn-3:active,
                .toolbar-btn.relay-btn-4:active {
                    transform: translateY(0px) scale(0.95) !important;
                }
            `;
            document.head.appendChild(relayStyle);
            console.log('✅ Added FIXED relay toolbar CSS - Size:', iconSize, 'Labels:', showLabels);
        }
        
        // Function to update toolbar button states
        function updateToolbarRelayButton(relayId, state) {
            console.log('🔄 Updating relay toolbar button:', relayId, 'state:', state);
            
            // Find the toolbar button by relay ID
            const relayNum = relayId.split('_')[1];
            let toolbarButton = document.querySelector(`.toolbar-btn.relay-btn-${relayNum}`);
            
            if (!toolbarButton) {
                // Try alternative selectors
                const selectors = [
                    `[class*="relay-btn-${relayNum}"]`,
                    `.relay-btn-${relayNum}`,
                    `button[title*="Relay ${relayNum}"]`
                ];
                
                for (const selector of selectors) {
                    toolbarButton = document.querySelector(selector);
                    if (toolbarButton) break;
                }
            }
            
            if (toolbarButton) {
                console.log('📍 Found relay button:', toolbarButton.className);
                
                // Remove existing state classes
                toolbarButton.classList.remove('relay-on', 'relay-off');
                
                // Add new state class
                if (state) {
                    toolbarButton.classList.add('relay-on');
                    console.log('🟢 Set relay button to ON state');
                } else {
                    toolbarButton.classList.add('relay-off');
                    console.log('⚪ Set relay button to OFF state');
                }
                
                // Update tooltip
                const relayName = toolbarButton.getAttribute('title') || relayId;
                const baseName = relayName.split(':')[0];
                toolbarButton.setAttribute('title', baseName + ': ' + (state ? 'ON' : 'OFF'));
                
            } else {
                console.warn('⚠️ Relay toolbar button not found for:', relayId);
            }
        }
        
        // Function to refresh all toolbar button states
        function refreshToolbarRelayStates() {
            fetch('/addons/relay_controller/status')
            .then(response => response.json())
            .then(data => {
                for (const [relayId, relayInfo] of Object.entries(data)) {
                    updateToolbarRelayButton(relayId, relayInfo.state);
                }
                console.log('✅ Refreshed all relay toolbar states');
            })
            .catch(error => {
                console.error('❌ Failed to refresh relay toolbar states:', error);
            });
        }
        
        // Main toggle function
        window.addonToggleRelay = function(data) {
            // Handle both data object and direct relay_id string
            const relayId = typeof data === 'string' ? data : (data && data.relay_id);
            
            if (!relayId) {
                console.error('❌ No relay ID provided to toggle function');
                return;
            }
            
            console.log('🎛️ Toggling relay:', relayId);
            
            fetch('/addons/relay_controller/toggle/' + relayId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('📊 Toggle response:', data);
                if (data.success) {
                    // Update toolbar button state
                    updateToolbarRelayButton(relayId, data.state);
                    
                    // Show success alert
                    if (typeof showAlert === 'function') {
                        showAlert(data.message, 'success');
                    }
                    // Add console message if function exists
                    if (typeof addConsoleMessage === 'function') {
                        addConsoleMessage(data.message, 'success');
                    }
                } else {
                    if (typeof showAlert === 'function') {
                        showAlert(data.message || 'Failed to toggle relay', 'error');
                    }
                    if (typeof addConsoleMessage === 'function') {
                        addConsoleMessage('Failed to toggle relay: ' + relayId, 'error');
                    }
                }
            })
            .catch(error => {
                console.error('❌ Toggle error:', error);
                if (typeof showAlert === 'function') {
                    showAlert('Network error: ' + error.message, 'error');
                }
                if (typeof addConsoleMessage === 'function') {
                    addConsoleMessage('Relay toggle error: ' + error.message, 'error');
                }
            });
        };
        
        // Ensure function is available globally
        if (typeof window !== 'undefined') {
            window.addonToggleRelay = window.addonToggleRelay;
            window.updateToolbarRelayButton = updateToolbarRelayButton;
            window.refreshToolbarRelayStates = refreshToolbarRelayStates;
        }
        
        // Initialize button states when page loads
        setTimeout(() => {
            refreshToolbarRelayStates();
        }, 1000);
        
        // Auto-refresh toolbar states every 15 seconds
        setInterval(refreshToolbarRelayStates, 15000);
        
        console.log('✅ FIXED Relay Controller toolbar functions loaded');
        console.log('🎛️ addonToggleRelay function available:', typeof window.addonToggleRelay);
        '''
    
    def get_api_routes(self):
        relay_bp = Blueprint('relay_controller_addon', __name__, url_prefix='/addons/relay_controller')
        
        @relay_bp.route('/toggle/<relay_id>', methods=['POST'])
        def toggle_relay(relay_id):
            try:
                current_state = self.relay_states.get(relay_id, False)
                new_state = not current_state
                
                if self.set_relay_state(relay_id, new_state):
                    display_state = self.get_display_state(relay_id, new_state)
                    relay_num = relay_id.split('_')[1]
                    relay_name = self.settings.get(f'relay_{relay_num}_name', f'Relay {relay_num}')
                    
                    logger.info(f"Toggled {relay_id}: {current_state} -> {new_state} (display: {display_state})")
                    return jsonify({
                        'success': True,
                        'relay_id': relay_id,
                        'state': display_state,
                        'actual_state': new_state,
                        'message': f'{relay_name} turned {"ON" if display_state else "OFF"}'
                    })
                else:
                    display_state = self.get_display_state(relay_id, current_state)
                    return jsonify({
                        'success': False,
                        'relay_id': relay_id,
                        'state': display_state,
                        'message': f'Failed to toggle {relay_id}'
                    }), 500
                    
            except Exception as e:
                logger.error(f"Relay toggle error: {e}")
                return jsonify({'success': False, 'error': str(e)}), 500
        
        @relay_bp.route('/status', methods=['GET'])
        def get_status():
            try:
                status = {}
                for i in range(1, 5):
                    if self.settings.get(f'relay_{i}_enabled', False):
                        relay_id = f'relay_{i}'
                        actual_state = self.relay_states.get(relay_id, False)
                        display_state = self.get_display_state(relay_id, actual_state)
                        
                        status[relay_id] = {
                            'state': display_state,
                            'actual_state': actual_state,
                            'name': self.settings.get(f'relay_{i}_name', f'Relay {i}'),
                            'gpio': self.settings.get(f'relay_{i}_gpio', 18),
                            'invert_logic': self.settings.get(f'relay_{i}_invert_logic', False)
                        }
                
                return jsonify(status)
                
            except Exception as e:
                logger.error(f"Status error: {e}")
                return jsonify({'success': False, 'error': str(e)}), 500
        
        @relay_bp.route('/test', methods=['GET'])
        def test_relay_system():
            """Test endpoint for debugging relay controller"""
            try:
                return jsonify({
                    'success': True,
                    'message': 'Relay Controller test endpoint',
                    'gpio_available': GPIO_AVAILABLE,
                    'gpio_initialized': self.gpio_initialized,
                    'relay_states': self.relay_states,
                    'enabled_relays': {
                        f'relay_{i}': self.settings.get(f'relay_{i}_enabled', False)
                        for i in range(1, 5)
                    },
                    'settings': {
                        'icon_size': self.settings.get('icon_size'),
                        'show_button_labels': self.settings.get('show_button_labels')
                    }
                })
            except Exception as e:
                logger.error(f"Test error: {e}")
                return jsonify({'success': False, 'error': str(e)}), 500
        
        return relay_bp
    
    def on_enable(self):
        """Called when addon is enabled"""
        logger.info("🟢 Relay Controller addon enabled")
        self.setup_gpio()
        logger.info(f"🎛️ Relay states after enable: {self.relay_states}")
    
    def on_disable(self):
        """Called when addon is disabled"""
        logger.info("🔴 Relay Controller addon disabled")
        self.cleanup_gpio()
    
    def on_settings_changed(self):
        """Called when settings are changed"""
        logger.info("⚙️ Relay Controller settings changed - reinitializing GPIO")
        self.cleanup_gpio()
        self.relay_states.clear()
        self.setup_gpio()
        logger.info(f"🎛️ Relay states after settings change: {self.relay_states}")
    
    def cleanup(self):
        """Cleanup when addon is disabled"""
        logger.info("🧹 Relay Controller cleanup")
        self.cleanup_gpio()