#!/usr/bin/env python3
"""
Settings API Routes for Resin Printer Control Application
Handles application settings, addon management, and configuration
"""

import json
import os
import shutil
import zipfile
from pathlib import Path
from flask import Blueprint, request, jsonify
import logging

logger = logging.getLogger(__name__)

def create_settings_routes(addon_manager, file_manager):
    """Create settings management routes"""
    
    settings_bp = Blueprint('settings', __name__, url_prefix='/api')
    
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
            with open(SETTINGS_FILE, 'w') as f:
                json.dump(settings, f, indent=2)
            logger.info("Settings saved successfully")
            return True
        except Exception as e:
            logger.error(f"Error saving settings: {e}")
            return False
    
    @settings_bp.route('/settings')
    def get_settings():
        """Get current application settings"""
        try:
            settings = load_settings()
            return jsonify(settings)
        except Exception as e:
            logger.error(f"Error getting settings: {e}")
            return jsonify({'error': str(e)}), 500
    
    @settings_bp.route('/settings', methods=['POST'])
    def update_settings():
        """Update application settings"""
        try:
            new_settings = request.get_json()
            
            if not new_settings:
                return jsonify({'error': 'No settings data provided'}), 400
            
            # Validate critical settings
            validation_errors = validate_settings(new_settings)
            if validation_errors:
                return jsonify({'error': 'Validation failed', 'details': validation_errors}), 400
            
            # Save settings
            if save_settings(new_settings):
                logger.info("Settings updated successfully")
                
                # Apply certain settings immediately if needed
                apply_runtime_settings(new_settings)
                
                return jsonify({'success': True, 'message': 'Settings saved successfully'})
            else:
                return jsonify({'error': 'Failed to save settings'}), 500
                
        except Exception as e:
            logger.error(f"Error updating settings: {e}")
            return jsonify({'error': str(e)}), 500
    
    @settings_bp.route('/settings/reset', methods=['POST'])
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
    
    def validate_settings(settings):
        """Validate settings data"""
        errors = []
        
        # Validate numeric values
        numeric_fields = {
            'updateInterval': (1, 30),
            'maxConsoleLines': (10, 500),
            'maxFiles': (10, 200),
            'maxFileAge': (1, 365),
            'baudRate': (9600, 250000),
            'timeout': (1, 30),
            'retryAttempts': (1, 10),
            'zSpeed': (100, 2000),
            'homeSpeed': (50, 1000)
        }
        
        for field, (min_val, max_val) in numeric_fields.items():
            if field in settings:
                try:
                    value = int(settings[field])
                    if not (min_val <= value <= max_val):
                        errors.append(f"{field} must be between {min_val} and {max_val}")
                except (ValueError, TypeError):
                    errors.append(f"{field} must be a valid number")
        
        # Validate serial port
        if 'serialPort' in settings:
            port = settings['serialPort']
            if port == 'custom' and not settings.get('customSerialPort'):
                errors.append("Custom serial port path is required when using custom port")
        
        # Validate file extensions
        if 'allowedExtensions' in settings:
            extensions = settings['allowedExtensions']
            if not extensions or not all(ext.startswith('.') for ext in extensions.split(',')):
                errors.append("File extensions must start with '.' and be comma-separated")
        
        return errors
    
    def apply_runtime_settings(settings):
        """Apply settings that can be changed at runtime"""
        try:
            # Update file manager settings if needed
            if hasattr(file_manager, 'update_settings'):
                file_settings = {
                    'max_files': settings.get('maxFiles', 50),
                    'max_age_days': settings.get('maxFileAge', 30),
                    'auto_cleanup': settings.get('autoCleanup', False)
                }
                file_manager.update_settings(file_settings)
            
            logger.info("Runtime settings applied")
            
        except Exception as e:
            logger.error(f"Error applying runtime settings: {e}")
    
    # Addon Management Routes
    @settings_bp.route('/addons/<addon_name>/enable', methods=['POST'])
    def enable_addon(addon_name):
        """Enable a specific addon"""
        try:
            logger.info(f"Attempting to enable addon: {addon_name}")
            
            if addon_name in addon_manager.addons:
                addon = addon_manager.addons[addon_name]
                
                # Try to initialize the addon
                success = addon.initialize(
                    None,  # app - not needed for re-initialization
                    addon_manager.printer_controller if hasattr(addon_manager, 'printer_controller') else None,
                    addon_manager.file_manager if hasattr(addon_manager, 'file_manager') else None
                )
                
                if success:
                    addon_manager.enabled_addons[addon_name] = addon
                    logger.info(f"Addon enabled: {addon_name}")
                    return jsonify({'success': True, 'message': f'Addon {addon_name} enabled'})
                else:
                    return jsonify({'error': f'Failed to initialize addon {addon_name}'}), 500
            else:
                return jsonify({'error': f'Addon {addon_name} not found'}), 404
                
        except Exception as e:
            logger.error(f"Error enabling addon {addon_name}: {e}")
            return jsonify({'error': str(e)}), 500
    
    @settings_bp.route('/addons/<addon_name>/disable', methods=['POST'])
    def disable_addon(addon_name):
        """Disable a specific addon"""
        try:
            logger.info(f"Attempting to disable addon: {addon_name}")
            
            if addon_name in addon_manager.enabled_addons:
                addon = addon_manager.enabled_addons[addon_name]
                
                # Cleanup addon
                try:
                    addon.cleanup()
                except Exception as e:
                    logger.warning(f"Error during addon cleanup: {e}")
                
                # Remove from enabled addons
                del addon_manager.enabled_addons[addon_name]
                
                logger.info(f"Addon disabled: {addon_name}")
                return jsonify({'success': True, 'message': f'Addon {addon_name} disabled'})
            else:
                return jsonify({'error': f'Addon {addon_name} not enabled or not found'}), 404
                
        except Exception as e:
            logger.error(f"Error disabling addon {addon_name}: {e}")
            return jsonify({'error': str(e)}), 500
    
    @settings_bp.route('/addons/<addon_name>/remove', methods=['DELETE', 'POST'])
    def remove_addon(addon_name):
        """Remove an addon completely"""
        try:
            logger.info(f"Attempting to remove addon: {addon_name}")
            
            # Disable addon first if enabled
            if addon_name in addon_manager.enabled_addons:
                try:
                    addon = addon_manager.enabled_addons[addon_name]
                    addon.cleanup()
                    del addon_manager.enabled_addons[addon_name]
                    logger.info(f"Addon disabled before removal: {addon_name}")
                except Exception as e:
                    logger.warning(f"Error disabling addon during removal: {e}")
            
            # Remove from available addons
            if addon_name in addon_manager.addons:
                del addon_manager.addons[addon_name]
                logger.info(f"Addon removed from manager: {addon_name}")
            
            # Remove addon directory
            addon_dir = addon_manager.addon_directory / addon_name
            if addon_dir.exists():
                shutil.rmtree(addon_dir)
                logger.info(f"Addon directory removed: {addon_dir}")
            else:
                logger.warning(f"Addon directory not found: {addon_dir}")
            
            logger.info(f"Addon successfully removed: {addon_name}")
            return jsonify({'success': True, 'message': f'Addon {addon_name} removed successfully'})
            
        except Exception as e:
            logger.error(f"Error removing addon {addon_name}: {e}")
            return jsonify({'error': str(e)}), 500
    
    @settings_bp.route('/addons/install', methods=['POST'])
    def install_addon():
        """Install new addon from uploaded files"""
        try:
            logger.info("Addon installation request received")
            
            # Check if files were uploaded
            if 'file' not in request.files and 'addon_files' not in request.files:
                return jsonify({'error': 'No files provided'}), 400
            
            # Handle both single file and multiple files
            files = []
            if 'file' in request.files:
                files = [request.files['file']]
            else:
                files = request.files.getlist('addon_files')
            
            installed_count = 0
            errors = []
            
            for file in files:
                if not file.filename:
                    continue
                
                try:
                    logger.info(f"Installing addon file: {file.filename}")
                    
                    if file.filename.endswith('.zip'):
                        # Handle zip file
                        success, message = install_addon_zip(file, addon_manager.addon_directory)
                    elif file.filename.endswith('.py'):
                        # Handle single Python file
                        success, message = install_addon_py(file, addon_manager.addon_directory)
                    else:
                        errors.append(f"Unsupported file type: {file.filename}")
                        continue
                    
                    if success:
                        installed_count += 1
                        logger.info(f"Addon installed successfully: {file.filename}")
                    else:
                        errors.append(f"{file.filename}: {message}")
                        
                except Exception as e:
                    logger.error(f"Error installing {file.filename}: {e}")
                    errors.append(f"{file.filename}: {str(e)}")
            
            if installed_count > 0:
                # Rediscover addons
                try:
                    addon_manager.discover_addons()
                    logger.info("Addons rediscovered after installation")
                except Exception as e:
                    logger.error(f"Error rediscovering addons: {e}")
                
                return jsonify({
                    'success': True,
                    'installed_count': installed_count,
                    'errors': errors,
                    'message': f'Successfully installed {installed_count} addon(s)'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'No addons were installed',
                    'errors': errors
                }), 400
                
        except Exception as e:
            logger.error(f"Error installing addons: {e}")
            return jsonify({'error': str(e)}), 500
    
    def install_addon_zip(file, addon_directory):
        """Install addon from zip file"""
        try:
            # Create temporary directory for extraction
            temp_dir = addon_directory / f"temp_{file.filename.replace('.zip', '')}"
            temp_dir.mkdir(exist_ok=True)
            
            # Save and extract zip
            zip_path = temp_dir / file.filename
            file.save(str(zip_path))
            
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
            
            # Find addon.py file
            addon_py = None
            for root, dirs, files in os.walk(temp_dir):
                if 'addon.py' in files:
                    addon_py = Path(root) / 'addon.py'
                    break
            
            if not addon_py:
                shutil.rmtree(temp_dir)
                return False, "No addon.py found in zip file"
            
            # Determine addon name from directory structure or filename
            addon_name = addon_py.parent.name
            if addon_name.startswith('temp_'):
                addon_name = file.filename.replace('.zip', '').replace('-', '_')
            
            # Move to final location
            final_dir = addon_directory / addon_name
            if final_dir.exists():
                shutil.rmtree(final_dir)
            
            shutil.move(str(addon_py.parent), str(final_dir))
            shutil.rmtree(temp_dir)
            
            logger.info(f"Addon zip installed to: {final_dir}")
            return True, f"Addon installed to {addon_name}"
            
        except Exception as e:
            logger.error(f"Error installing zip addon: {e}")
            return False, str(e)
    
    def install_addon_py(file, addon_directory):
        """Install addon from single Python file"""
        try:
            # Create addon directory
            addon_name = file.filename.replace('.py', '').replace('-', '_')
            addon_dir = addon_directory / addon_name
            addon_dir.mkdir(exist_ok=True)
            
            # Save file as addon.py
            addon_file = addon_dir / 'addon.py'
            file.save(str(addon_file))
            
            logger.info(f"Addon Python file installed to: {addon_dir}")
            return True, f"Addon installed to {addon_name}"
            
        except Exception as e:
            logger.error(f"Error installing Python addon: {e}")
            return False, str(e)
    
    @settings_bp.route('/addons/marketplace')
    def get_marketplace_addons():
        """Get available addons from marketplace (placeholder)"""
        # This would connect to an addon marketplace/repository
        marketplace_addons = [
            {
                'name': 'Temperature Monitor',
                'version': '1.0.0',
                'description': 'Monitor printer and ambient temperature',
                'author': 'Community',
                'type': 'card',
                'download_url': 'https://example.com/temp-monitor.zip',
                'rating': 4.5,
                'downloads': 1250
            },
            {
                'name': 'Print Time Estimator',
                'version': '2.1.0',
                'description': 'Advanced print time estimation',
                'author': 'PrintLab',
                'type': 'api',
                'download_url': 'https://example.com/time-estimator.zip',
                'rating': 4.8,
                'downloads': 890
            }
        ]
        
        return jsonify(marketplace_addons)
    
    @settings_bp.route('/settings/export')
    def export_settings():
        """Export current settings and addon configuration"""
        try:
            settings = load_settings()
            addon_info = addon_manager.get_addon_info() if hasattr(addon_manager, 'get_addon_info') else []
            
            export_data = {
                'version': '1.0',
                'timestamp': str(Path().ctime()),
                'settings': settings,
                'addons': addon_info
            }
            
            return jsonify(export_data)
            
        except Exception as e:
            logger.error(f"Error exporting settings: {e}")
            return jsonify({'error': str(e)}), 500
    
    @settings_bp.route('/settings/import', methods=['POST'])
    def import_settings():
        """Import settings and addon configuration"""
        try:
            data = request.get_json()
            
            if not data or 'settings' not in data:
                return jsonify({'error': 'Invalid import data'}), 400
            
            # Validate and save settings
            settings = data['settings']
            validation_errors = validate_settings(settings)
            
            if validation_errors:
                return jsonify({'error': 'Invalid settings', 'details': validation_errors}), 400
            
            if save_settings(settings):
                apply_runtime_settings(settings)
                logger.info("Settings imported successfully")
                return jsonify({'success': True, 'message': 'Settings imported successfully'})
            else:
                return jsonify({'error': 'Failed to save imported settings'}), 500
                
        except Exception as e:
            logger.error(f"Error importing settings: {e}")
            return jsonify({'error': str(e)}), 500
    
    return settings_bp