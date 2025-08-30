#!/usr/bin/env python3
"""
API route handlers for the Flask application
FIXED: Removed all conflicting addon removal routes - handled by app.py only
"""

import time
import logging
import json
from pathlib import Path
from flask import Blueprint, request, jsonify
from printer_state import PrinterState, PrintStatus, serialize_print_status
from usb_manager import USBManager

logger = logging.getLogger(__name__)

def create_api_routes(printer_controller, file_manager, addon_manager=None):
    """Create API routes blueprint - NO ADDON REMOVAL ROUTES (handled by app.py)"""
    
    api = Blueprint('api', __name__, url_prefix='/api')
    usb_manager = USBManager()
    
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
            'defaultView': 'dashboard',
            'customCSS': ''
        }
    
    def load_settings():
        """Load settings from file"""
        try:
            if SETTINGS_FILE.exists():
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
    
    # ==================== REMOVED ALL ADDON MANAGEMENT ROUTES ====================
    # NOTE: All addon management routes have been moved to app.py to prevent conflicts
    # - /api/addons/<name>/enable - now in app.py
    # - /api/addons/<name>/disable - now in app.py  
    # - /api/addons/<name>/remove - now in app.py (SINGLE WORKING VERSION)
    # - /api/addons/debug/list_directories - now in app.py
    # This prevents route conflicts that were causing the filesystem removal to fail
    
    # ==================== USB MANAGEMENT ROUTES ====================

    @api.route('/check_usb_installation')
    def api_check_usb_installation():
        """Check if USB gadget is installed"""
        try:
            return jsonify(usb_manager.check_installation())
        except Exception as e:
            logger.error(f"Failed to check USB installation: {e}")
            return jsonify({'error': str(e), 'installed': False})

    @api.route('/usb_status')
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

    @api.route('/start_usb_gadget', methods=['POST'])
    def api_start_usb_gadget():
        """Start USB gadget"""
        try:
            return jsonify(usb_manager.start_gadget())
        except Exception as e:
            logger.error(f"Failed to start USB gadget: {e}")
            return jsonify({'success': False, 'error': str(e)})

    @api.route('/stop_usb_gadget', methods=['POST'])
    def api_stop_usb_gadget():
        """Stop USB gadget"""
        try:
            return jsonify(usb_manager.stop_gadget())
        except Exception as e:
            logger.error(f"Failed to stop USB gadget: {e}")
            return jsonify({'success': False, 'error': str(e)})

    @api.route('/recover_usb_error', methods=['POST'])
    def api_recover_usb_error():
        """Recover from USB/Memory errors"""
        try:
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

    @api.route('/install_usb_gadget', methods=['POST'])
    def api_install_usb_gadget():
        """This route is not needed since setup already exists"""
        return jsonify({
            'success': False, 
            'error': 'USB gadget already installed using g_mass_storage. No additional installation needed.'
        })
    
    @api.route('/file_formats')
    def api_file_formats():
        """Get supported file formats for the application"""
        try:
            # Get supported formats from config
            from config import ALLOWED_EXTENSIONS
            
            formats = []
            for ext in ALLOWED_EXTENSIONS:
                formats.append({
                    'extension': ext,
                    'name': ext.upper().replace('.', ''),
                    'description': f'{ext.upper()} file format',
                    'supported': True
                })
            
            return jsonify({
                'success': True,
                'formats': formats,
                'total_formats': len(formats),
                'message': f'Found {len(formats)} supported file formats'
            })
            
        except Exception as e:
            logger.error(f"Failed to get file formats: {e}")
            return jsonify({
                'success': False,
                'error': str(e),
                'formats': [],
                'total_formats': 0
            })
            
    return api