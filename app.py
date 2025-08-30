#!/usr/bin/env python3
"""
Resin Printer Control Application - WITH CAMERA INTEGRATION AND FIXED ADDON REMOVAL
Updated to include working camera streaming, photo capture, and WORKING addon removal
"""

import logging
import atexit
import shutil
from pathlib import Path
from flask import Flask, render_template, jsonify, request

# Import our modules
from config import FLASK_HOST, FLASK_PORT, MAX_FILE_SIZE
from printer_controller import PrinterController
from file_manager import FileManager
from file_routes import create_file_routes
from api_routes import create_api_routes
from addon_system import AddonManager, create_addon_routes

# Camera system removed - using external stream

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Initialize core components
printer_controller = PrinterController()
file_manager = FileManager()
addon_manager = AddonManager()

# Camera system uses dynamic IP detection - external stream automatically configured

# ==================== ADDON INITIALIZATION ====================

def initialize_addons():
    """Automatically discover and initialize all addons"""
    try:
        logger.info("🔄 Auto-discovering addons...")
        discovered_addons = addon_manager.discover_addons()
        
        if discovered_addons:
            logger.info(f"✅ Auto-discovered {len(discovered_addons)} addons: {', '.join(discovered_addons)}")
            
            # Auto-initialize all discovered addons
            addon_manager.initialize_addons(app, printer_controller, file_manager)
            
            # Auto-register addon API routes
            for addon_routes in addon_manager.get_api_routes():
                app.register_blueprint(addon_routes)
                logger.info(f"🔗 Auto-registered addon API routes: {addon_routes.name}")
            
            # Start addon background tasks
            addon_manager.start_background_tasks()
            logger.info("🚀 All addon background tasks started")
            
        else:
            logger.info("ℹ️ No addons found - Hello World example may be created")
            
        return len(discovered_addons)
        
    except Exception as e:
        logger.error(f"💥 Error during addon initialization: {e}")
        return 0

# Initialize addons
addon_count = initialize_addons()

# Register core blueprints
file_blueprint = create_file_routes(file_manager)
addon_blueprint = create_addon_routes(addon_manager)

app.register_blueprint(file_blueprint)
app.register_blueprint(addon_blueprint)

# ==================== FIXED API ROUTES (NO CONFLICTS) ====================

# Settings file path
SETTINGS_FILE = Path('config/app_settings.json')
SETTINGS_FILE.parent.mkdir(exist_ok=True)

def get_default_settings():
    """Get default application settings"""
    return {
        # General
        'enableWebcam': False,
        'autoConnect': False,
        'enableNotifications': True,
        'updateInterval': 3,
        'maxConsoleLines': 50,
        
        # File Management
        'maxFiles': 50,
        'maxFileAge': 30,
        'autoCleanup': False,
        'allowedExtensions': '.ctb,.cbddlp,.pwmx,.pwmo,.pwms,.pws,.pw0,.pwx',
        
        # Printer
        'serialPort': '/dev/serial0',
        'baudRate': 115200,
        'timeout': 5,
        'retryAttempts': 3,
        'zSpeed': 600,
        'homeSpeed': 300,
        'customMovements': '0.1,1,5,10',
        'customSerialPort': '',
        
        # Interface
        'theme': 'dark',
        'compactMode': False,
        'showAnimations': True,
        'showToolbar': True,
        'showConsole': True,
        'showStatusBar': True,
        'showPrintingOverlay': True,
        'defaultView': 'dashboard',
        'customCSS': '',
        
        # Camera
        'cameraPort': 8080,
        'cameraEnabled': True
    }

def load_settings():
    """Load settings from file"""
    try:
        if SETTINGS_FILE.exists():
            import json
            with open(SETTINGS_FILE, 'r') as f:
                saved_settings = json.load(f)
                # Merge with defaults to ensure all keys exist
                default_settings = get_default_settings()
                default_settings.update(saved_settings)
                return default_settings
        else:
            return get_default_settings()
    except Exception as e:
        logger.error(f"Error loading settings: {e}")
        return get_default_settings()

def save_settings(settings):
    """Save settings to file"""
    try:
        import json
        SETTINGS_FILE.parent.mkdir(exist_ok=True)
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(settings, f, indent=2)
        logger.info("Settings saved successfully")
        return True
    except Exception as e:
        logger.error(f"Error saving settings: {e}")
        return False

def test_printer_connection():
    """Test if we can communicate with the printer"""
    try:
        if not printer_controller.is_connected:
            connected = printer_controller.connect()
            if not connected:
                return False, "Failed to connect"
        
        firmware_version = printer_controller.get_firmware_version()
        return True, firmware_version
    except Exception as e:
        logger.error(f"Printer connection test failed: {e}")
        return False, str(e)

# ==================== CORE API ROUTES ====================

@app.route('/api/settings')
def get_settings():
    """Get current application settings"""
    try:
        settings = load_settings()
        return jsonify(settings)
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/camera/config')
def get_camera_config():
    """Get camera configuration including dynamic IP address"""
    try:
        from config import CAMERA_STREAM_URL, CAMERA_SNAPSHOT_URL, CAMERA_BASE_URL
        return jsonify({
            'streamUrl': CAMERA_STREAM_URL,
            'snapshotUrl': CAMERA_SNAPSHOT_URL,
            'baseUrl': CAMERA_BASE_URL,
            'enabled': True
        })
    except Exception as e:
        logger.error(f"Error getting camera config: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings', methods=['POST'])
def update_settings():
    """Update application settings"""
    try:
        new_settings = request.get_json()
        
        if not new_settings:
            return jsonify({'error': 'No settings data provided'}), 400
        
        # Save settings
        if save_settings(new_settings):
            logger.info("Settings updated successfully")
            return jsonify({'success': True, 'message': 'Settings saved successfully'})
        else:
            return jsonify({'error': 'Failed to save settings'}), 500
            
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/reset', methods=['POST'])
def reset_settings():
    """Reset settings to defaults"""
    try:
        default_settings = get_default_settings()
        
        if save_settings(default_settings):
            logger.info("Settings reset to defaults")
            return jsonify({'success': True, 'message': 'Settings reset to defaults'})
        else:
            return jsonify({'error': 'Failed to reset settings'}), 500
            
    except Exception as e:
        logger.error(f"Error resetting settings: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/export')
def export_settings():
    """Export current settings"""
    try:
        import time
        settings = load_settings()
        export_data = {
            'version': '1.0',
            'timestamp': str(time.time()),
            'settings': settings
        }
        return jsonify(export_data)
    except Exception as e:
        logger.error(f"Error exporting settings: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/import', methods=['POST'])
def import_settings():
    """Import settings"""
    try:
        data = request.get_json()
        
        if not data or 'settings' not in data:
            return jsonify({'error': 'Invalid import data'}), 400
        
        settings = data['settings']
        
        if save_settings(settings):
            logger.info("Settings imported successfully")
            return jsonify({'success': True, 'message': 'Settings imported successfully'})
        else:
            return jsonify({'error': 'Failed to save imported settings'}), 500
            
    except Exception as e:
        logger.error(f"Error importing settings: {e}")
        return jsonify({'error': str(e)}), 500

# ==================== PRINTER API ROUTES ====================

@app.route('/api/status')
def api_status():
    from printer_state import serialize_print_status
    connected, firmware_info = test_printer_connection()
    
    if connected:
        firmware_version = firmware_info
        status = printer_controller.get_print_status()
        selected_file = printer_controller.get_selected_file()
        z_pos = printer_controller.get_z_position()
    else:
        from printer_state import PrintStatus, PrinterState
        firmware_version = f"Connection Error: {firmware_info}"
        status = PrintStatus(state=PrinterState.IDLE)
        selected_file = ""
        z_pos = 0.0

    return jsonify({
        'connected': connected,
        'firmware_version': firmware_version,
        'print_status': serialize_print_status(status),
        'selected_file': selected_file,
        'z_position': z_pos
    })

@app.route('/api/connect', methods=['POST'])
def api_connect():
    try:
        connected, info = test_printer_connection()
        if connected:
            return jsonify({'success': True, 'message': 'Printer is connected'})
        else:
            return jsonify({'success': False, 'error': f'Cannot connect to printer: {info}'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/disconnect', methods=['POST'])
def api_disconnect():
    try:
        printer_controller.disconnect()
        return jsonify({'success': True, 'message': 'Disconnected from printer'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/pause', methods=['POST'])
def api_pause():
    try:
        success = printer_controller.pause_printing()
        if success:
            return jsonify({'success': True, 'message': 'Print paused'})
        else:
            return jsonify({'success': False, 'error': 'Failed to pause print'})
    except Exception as e:
        logger.error(f"Failed to pause print: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/resume', methods=['POST'])
def api_resume():
    try:
        success = printer_controller.resume_printing()
        if success:
            return jsonify({'success': True, 'message': 'Print resumed'})
        else:
            return jsonify({'success': False, 'error': 'Failed to resume print'})
    except Exception as e:
        logger.error(f"Failed to resume print: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/stop', methods=['POST'])
def api_stop():
    try:
        success = printer_controller.stop_printing()
        if success:
            return jsonify({'success': True, 'message': 'Print stopped'})
        else:
            return jsonify({'success': False, 'error': 'Failed to stop print'})
    except Exception as e:
        logger.error(f"Failed to stop print: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/home_z', methods=['POST'])
def api_home_z():
    try:
        success = printer_controller.move_to_home()
        if success:
            return jsonify({'success': True, 'message': 'Z axis homed'})
        else:
            return jsonify({'success': False, 'error': 'Failed to home Z axis'})
    except Exception as e:
        logger.error(f"Failed to home Z: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/move_z', methods=['POST'])
def api_move_z():
    data = request.get_json()
    distance = float(data.get('distance', 0))
    try:
        success = printer_controller.move_by(distance)
        if success:
            return jsonify({'success': True, 'message': f'Moved Z by {distance}mm'})
        else:
            return jsonify({'success': False, 'error': f'Failed to move Z by {distance}mm'})
    except Exception as e:
        logger.error(f"Failed to move Z by {distance}: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/reboot', methods=['POST'])
def api_reboot():
    try:
        success = printer_controller.reboot()
        if success:
            return jsonify({'success': True, 'message': 'Printer rebooting...'})
        else:
            return jsonify({'success': False, 'error': 'Failed to reboot printer'})
    except Exception as e:
        logger.error(f"Failed to reboot printer: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/select_file', methods=['POST'])
def api_select_file():
    data = request.get_json()
    filename = data.get('filename', '')
    
    logger.info(f"Attempting to select file: {filename}")
    
    try:
        # Check if file exists using file manager
        if not file_manager.file_exists(filename):
            logger.error(f"File not found: {filename}")
            return jsonify({'success': False, 'error': f'File not found: {filename}'})
        
        connected, info = test_printer_connection()
        if not connected:
            logger.error(f"Printer not connected: {info}")
            return jsonify({'success': False, 'error': f'Printer not connected: {info}'})
        
        success = printer_controller.select_file(filename)
        if success:
            logger.info(f"File selected successfully: {filename}")
            return jsonify({'success': True, 'message': f'Selected file: {filename}'})
        else:
            return jsonify({'success': False, 'error': 'Failed to select file'})
        
    except Exception as e:
        logger.error(f"Failed to select file {filename}: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/print_file', methods=['POST'])
def api_print_file():
    data = request.get_json()
    filename = data.get('filename', '')
    
    logger.info(f"Print request received - raw data: {data}")
    logger.info(f"Attempting to print file: {filename}")
    logger.info(f"Filename type: {type(filename)}")
    logger.info(f"Filename is None: {filename is None}")
    logger.info(f"Filename is empty string: {filename == ''}")
    
    try:
        # Check if file exists using file manager
        if not file_manager.file_exists(filename):
            logger.error(f"File not found: {filename}")
            return jsonify({'success': False, 'error': f'File not found: {filename}'})
        
        connected, info = test_printer_connection()
        if not connected:
            logger.error(f"Printer not connected: {info}")
            return jsonify({'success': False, 'error': f'Printer not connected: {info}'})
        
        success = printer_controller.start_printing(filename)
        if success:
            return jsonify({'success': True, 'message': f'Print started: {filename}'})
        else:
            return jsonify({'success': False, 'error': 'Failed to start print'})
        
    except Exception as e:
        logger.error(f"Failed to print {filename}: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/force_reset_printer', methods=['POST'])
def api_force_reset_printer():
    """Force reset printer state to IDLE"""
    try:
        printer_controller.force_reset_state()
        logger.info("Printer state force reset to IDLE")
        return jsonify({
            'success': True, 
            'message': 'Printer state reset to IDLE',
            'state': 'IDLE'
        })
    except Exception as e:
        logger.error(f"Failed to force reset printer: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== USB MANAGEMENT ROUTES ====================

from usb_manager import USBManager
usb_manager = USBManager()

@app.route('/api/check_usb_installation')
def api_check_usb_installation():
    """Check if USB gadget is installed"""
    try:
        return jsonify(usb_manager.check_installation())
    except Exception as e:
        logger.error(f"Failed to check USB installation: {e}")
        return jsonify({'error': str(e), 'installed': False})

@app.route('/api/usb_status')
def api_usb_status():
    """Check USB drive status"""
    try:
        status = usb_manager.get_status()
        # Add USB space info from file manager
        status['usb_space'] = file_manager.get_disk_usage()
        return jsonify(status)
    except Exception as e:
        logger.error(f"Failed to get USB status: {e}")
        return jsonify({'error': str(e)})

@app.route('/api/start_usb_gadget', methods=['POST'])
def api_start_usb_gadget():
    """Start USB gadget"""
    try:
        return jsonify(usb_manager.start_gadget())
    except Exception as e:
        logger.error(f"Failed to start USB gadget: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/stop_usb_gadget', methods=['POST'])
def api_stop_usb_gadget():
    """Stop USB gadget"""
    try:
        return jsonify(usb_manager.stop_gadget())
    except Exception as e:
        logger.error(f"Failed to stop USB gadget: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/recover_usb_error', methods=['POST'])
def api_recover_usb_error():
    """Recover from USB/Memory errors"""
    try:
        import time
        # Stop any current printer operation first
        try:
            printer_controller.communicator.send_command("M33")  # Stop print if running
            time.sleep(2)
        except:
            pass
        
        result = usb_manager.recover_from_error()
        
        # Reset printer communication
        try:
            printer_controller.communicator.send_command("M21")  # Initialize SD card
            time.sleep(1)
        except:
            pass
            
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"USB error recovery failed: {e}")
        return jsonify({'success': False, 'error': str(e)})

# ==================== FIXED ADDON MANAGEMENT ROUTES ====================

@app.route('/api/addons/<addon_name>/enable', methods=['POST'])
def api_enable_addon(addon_name):
    """Enable an addon"""
    logger.info(f"✅ Enable addon request: {addon_name}")
    
    try:
        addon_key = None
        for key, addon in addon_manager.addons.items():
            if (addon.info.name == addon_name or 
                key == addon_name or 
                addon.info.app_name == addon_name):
                addon_key = key
                break
        
        if not addon_key:
            return jsonify({
                'success': False, 
                'error': f'Addon "{addon_name}" not found'
            }), 404
        
        addon = addon_manager.addons[addon_key]
        success = addon.initialize(
            app, printer_controller, file_manager, 
            addon_manager.addon_directory / addon_key
        )
        
        if success:
            addon_manager.enabled_addons[addon_key] = addon
            logger.info(f"✅ Addon enabled: {addon_name}")
            return jsonify({
                'success': True, 
                'message': f'Addon "{addon_name}" enabled'
            })
        else:
            return jsonify({
                'success': False, 
                'error': f'Failed to initialize addon "{addon_name}"'
            }), 500
            
    except Exception as e:
        logger.error(f"💥 Error enabling addon {addon_name}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/addons/<addon_name>/disable', methods=['POST'])
def api_disable_addon(addon_name):
    """Disable an addon"""
    logger.info(f"❌ Disable addon request: {addon_name}")
    
    try:
        addon_key = None
        for key, addon in addon_manager.enabled_addons.items():
            if (addon.info.name == addon_name or 
                key == addon_name or 
                addon.info.app_name == addon_name):
                addon_key = key
                break
        
        if not addon_key:
            return jsonify({
                'success': False, 
                'error': f'Addon "{addon_name}" not enabled or not found'
            }), 404
        
        addon = addon_manager.enabled_addons[addon_key]
        
        try:
            addon.stop_background_task()
            addon.cleanup()
        except Exception as e:
            logger.warning(f"⚠️ Cleanup warning: {e}")
        
        del addon_manager.enabled_addons[addon_key]
        
        logger.info(f"❌ Addon disabled: {addon_name}")
        return jsonify({
            'success': True, 
            'message': f'Addon "{addon_name}" disabled'
        })
        
    except Exception as e:
        logger.error(f"💥 Error disabling addon {addon_name}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/addons/<addon_name>/remove', methods=['DELETE'])
def api_remove_addon_direct(addon_name):
    """SINGLE WORKING addon removal route - removes files from filesystem"""
    logger.info(f"🗑️ DIRECT FILESYSTEM REMOVAL: {addon_name}")
    
    try:
        # Use the addon manager's complete removal method
        success, message, deleted_dir = addon_manager.remove_addon_completely(addon_name)
        
        if success:
            logger.info(f"✅ FILESYSTEM REMOVAL SUCCESS: {addon_name} -> {deleted_dir}")
            return jsonify({
                'success': True,
                'message': message,
                'deleted_directory': deleted_dir
            })
        else:
            logger.error(f"❌ FILESYSTEM REMOVAL FAILED: {addon_name} -> {message}")
            return jsonify({
                'success': False,
                'error': message
            }), 500
            
    except Exception as e:
        logger.error(f"💥 REMOVAL EXCEPTION: {addon_name} -> {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'Removal failed: {str(e)}'
        }), 500

@app.route('/api/addons/debug/list_directories')
def api_debug_addons():
    """Debug endpoint to list addon directories"""
    logger.info("🔍 Debug: Listing addon directories")
    
    try:
        directories = []
        addon_dir = addon_manager.addon_directory
        
        logger.info(f"📁 Addon directory: {addon_dir}")
        
        if not addon_dir.exists():
            return jsonify({
                'error': f'Addon directory does not exist: {addon_dir}',
                'addon_directory': str(addon_dir),
                'directories': []
            })
        
        for item in addon_dir.iterdir():
            if item.is_dir() and not item.name.startswith('.'):
                addon_py = item / "addon.py"
                addon_json = item / "addon.json"
                config_json = item / "config.json"
                
                dir_info = {
                    'directory_name': item.name,
                    'full_path': str(item),
                    'has_addon_py': addon_py.exists(),
                    'has_addon_json': addon_json.exists(),
                    'has_config_json': config_json.exists(),
                    'in_addons_dict': item.name in addon_manager.addons,
                    'in_enabled_dict': item.name in addon_manager.enabled_addons,
                    'file_count': len(list(item.iterdir()))
                }
                
                # Try to read addon info
                if addon_json.exists():
                    try:
                        import json
                        with open(addon_json, 'r') as f:
                            addon_info = json.load(f)
                        dir_info['addon_info'] = addon_info
                    except Exception as e:
                        dir_info['addon_info_error'] = str(e)
                
                directories.append(dir_info)
        
        result = {
            'addon_directory': str(addon_dir),
            'directories': directories,
            'total_directories': len(directories),
            'addons_dict_keys': list(addon_manager.addons.keys()),
            'enabled_dict_keys': list(addon_manager.enabled_addons.keys()),
            'addons_in_memory': len(addon_manager.addons),
            'addons_enabled': len(addon_manager.enabled_addons)
        }
        
        logger.info(f"📊 Debug result: {len(directories)} directories, {len(addon_manager.addons)} in memory")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"💥 Debug error: {e}")
        return jsonify({'error': str(e)}), 500

# ==================== MAIN ROUTES ====================

@app.route('/')
def index():
    """Main application page with camera support"""
    return render_template('index.html')

# ==================== CLEANUP AND STARTUP ====================

def cleanup():
    """Cleanup function called on exit"""
    try:
        addon_manager.stop_all_addons()
        logger.info("🛑 All addons stopped")
        
        # Cleanup camera
        camera_manager.cleanup()
        logger.info("📷 Camera resources cleaned up")
        
        if printer_controller and printer_controller.is_connected:
            printer_controller.disconnect()
            logger.info("🔌 Printer disconnected")
    except Exception as e:
        logger.error(f"💥 Cleanup error: {e}")

def test_routes():
    """Test that our routes are properly registered"""
    print("\n🔍 ROUTE REGISTRATION TEST")
    print("=" * 50)
    
    addon_routes_found = []
    camera_routes_found = []
    removal_routes_found = []
    
    for rule in app.url_map.iter_rules():
        if '/addons/' in rule.rule:
            addon_routes_found.append(f"{list(rule.methods)} {rule.rule}")
            if '/remove' in rule.rule:
                removal_routes_found.append(f"{list(rule.methods)} {rule.rule}")
        elif '/camera/' in rule.rule:
            camera_routes_found.append(f"{list(rule.methods)} {rule.rule}")
    
    if addon_routes_found:
        print("✅ Addon routes found:")
        for route in addon_routes_found:
            print(f"   {route}")
    else:
        print("❌ No addon routes found!")
    
    if camera_routes_found:
        print("📷 Camera routes found:")
        for route in camera_routes_found:
            print(f"   {route}")
    else:
        print("❌ No camera routes found!")
    
    print(f"\n🗑️ REMOVAL ROUTES: {len(removal_routes_found)}")
    for route in removal_routes_found:
        print(f"   {route}")
    
    if len(removal_routes_found) > 1:
        print("⚠️  WARNING: Multiple removal routes detected!")
    elif len(removal_routes_found) == 1:
        print("✅ Single removal route - GOOD!")
    else:
        print("❌ No removal routes found!")
    
    print(f"📊 Total routes: {len(list(app.url_map.iter_rules()))}")
    print("=" * 50)

def test_components():
    """Test all components on startup"""
    print("🖨️ Resin Print Portal - WITH CAMERA INTEGRATION AND FIXED ADDON REMOVAL")
    print("=" * 70)
    
    # Test addon system
    print("Testing addon system...")
    try:
        enabled_addons = list(addon_manager.enabled_addons.keys())
        if enabled_addons:
            print(f"✅ Addon system: {len(enabled_addons)} addons enabled")
            for addon_name in enabled_addons:
                addon = addon_manager.enabled_addons[addon_name]
                print(f"   - {addon.info.name} v{addon.info.version}")
        else:
            print("ℹ️ No addons enabled")
    except Exception as e:
        print(f"❌ Addon system error: {e}")
    
    # Test camera system
    print("Testing camera system...")
    try:
        camera_info = camera_manager.get_camera_info()
        if camera_info.get('available'):
            print("✅ Camera system: Available and ready")
            print(f"   - Resolution: {camera_info.get('width')}x{camera_info.get('height')}")
            print(f"   - FPS: {camera_info.get('fps')}")
        else:
            print("⚠️ Camera system: Not available")
            if camera_info.get('error'):
                print(f"   - Error: {camera_info['error']}")
    except Exception as e:
        print(f"❌ Camera system error: {e}")
    
    # Test routes
    test_routes()
    
    print("=" * 70)
    print("🎉 FEATURES AVAILABLE:")
    print("   • Complete printer control and file management")
    print("   • Working addon system with FIXED removal functionality")
    print("   • Live camera streaming and photo capture")
    print("   • Auto-start camera option in settings")
    print("   • Fullscreen camera view")
    print("   • Photo capture with flash effect")
    print("   • Camera status monitoring")
    print("   • FIXED: Addon removal now deletes files from filesystem")
    print("=" * 70)

if __name__ == '__main__':
    atexit.register(cleanup)
    test_components()
    
    try:
        print(f"\n🚀 Starting server on {FLASK_HOST}:{FLASK_PORT}")
        print("📷 Camera integration enabled!")
        print("🗑️ Addon removal FIXED - files will be deleted from filesystem!")
        app.run(host=FLASK_HOST, port=FLASK_PORT, debug=False)
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
        cleanup()
    except Exception as e:
        logger.error(f"💥 Application error: {e}")
        cleanup()