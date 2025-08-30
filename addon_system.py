#!/usr/bin/env python3
"""
Self-Contained Addon system for the Resin Printer Control Application
Updated with better removal support and error handling
No main app modifications required - fully automatic discovery and integration
"""

import os
import importlib
import importlib.util
import logging
import json
import zipfile
import subprocess
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
from flask import Blueprint, jsonify, request

logger = logging.getLogger(__name__)

class AddonType(Enum):
    TOOLBAR = "toolbar"
    CARD = "card"
    API = "api"
    BACKGROUND = "background"

@dataclass
class AddonInfo:
    name: str
    app_name: str
    version: str
    description: str
    author: str
    addon_type: AddonType
    dependencies: List[str] = None
    enabled: bool = True
    
    def to_dict(self):
        return {
            'name': self.name,
            'app_name': self.app_name,
            'version': self.version,
            'description': self.description,
            'author': self.author,
            'type': self.addon_type.value,
            'dependencies': self.dependencies or [],
            'enabled': self.enabled
        }

class BaseAddon:
    """Base class for all self-contained addons"""
    
    def __init__(self):
        self.info = AddonInfo(
            name="Base Addon",
            app_name="base_addon",
            version="1.0.0",
            description="Base addon class",
            author="System",
            addon_type=AddonType.CARD
        )
        self.settings = {}
        self.config_file = None
        self.addon_directory = None
    
    def initialize(self, app, printer_controller, file_manager, addon_directory):
        """Initialize the addon with app components and its directory"""
        self.app = app
        self.printer_controller = printer_controller
        self.file_manager = file_manager
        self.addon_directory = Path(addon_directory)
        
        # Setup config file path
        self.config_file = self.addon_directory / "config.json"
        
        # Load settings
        self.load_settings()
        
        return True
    
    def get_default_settings(self):
        """Override this method to provide default settings"""
        return {}
    
    def load_settings(self):
        """Load addon settings from config file"""
        try:
            if self.config_file and self.config_file.exists():
                with open(self.config_file, 'r') as f:
                    self.settings = json.load(f)
            else:
                self.settings = self.get_default_settings()
                self.save_settings()
        except Exception as e:
            logger.error(f"Failed to load settings for {self.info.name}: {e}")
            self.settings = self.get_default_settings()
    
    def save_settings(self):
        """Save addon settings to config file"""
        try:
            if self.config_file:
                self.config_file.parent.mkdir(exist_ok=True)
                with open(self.config_file, 'w') as f:
                    json.dump(self.settings, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save settings for {self.info.name}: {e}")
    
    def update_settings(self, new_settings):
        """Update addon settings"""
        self.settings.update(new_settings)
        self.save_settings()
        return True
    
    def get_settings_schema(self):
        """Override this method to provide settings UI schema"""
        return {}
    
    def get_toolbar_items(self) -> List[Dict[str, Any]]:
        """Return toolbar items for this addon"""
        return []
    
    def get_card_html(self) -> str:
        """Return HTML for card-based addon"""
        return ""
    
    def get_card_javascript(self) -> str:
        """Return JavaScript for card-based addon"""
        return ""
    
    def get_api_routes(self):
        """Return Flask blueprint for API routes"""
        return None
    
    def start_background_task(self):
        """Start background tasks if needed"""
        pass
    
    def stop_background_task(self):
        """Stop background tasks"""
        pass
    
    def cleanup(self):
        """Cleanup when addon is disabled or app shuts down"""
        pass

class AddonManager:
    """Self-contained addon manager - no main app modifications needed"""
    
    def __init__(self, addon_directory="addons"):
        self.addon_directory = Path(addon_directory)
        self.addon_directory.mkdir(exist_ok=True)
        self.addons: Dict[str, BaseAddon] = {}
        self.enabled_addons: Dict[str, BaseAddon] = {}
        
        # Create example Hello World addon if none exist
        self._create_hello_world_example()
        
    def _create_hello_world_example(self):
        """Create Hello World example addon if no addons exist"""
        hello_world_dir = self.addon_directory / "hello_world"
        
        if not hello_world_dir.exists() and len(list(self.addon_directory.glob("*"))) == 0:
            try:
                hello_world_dir.mkdir(exist_ok=True)
                
                # Create addon.json
                addon_info = {
                    "name": "Hello World Addon",
                    "app_name": "hello_world",
                    "version": "1.0.0",
                    "description": "A simple demonstration addon that shows toolbar buttons and dashboard cards",
                    "author": "System Example",
                    "type": "card",
                    "dependencies": []
                }
                
                with open(hello_world_dir / "addon.json", 'w') as f:
                    json.dump(addon_info, f, indent=2)
                
                # Create addon.py with proper API routes
                addon_code = '''#!/usr/bin/env python3
"""
Hello World Addon - Auto-generated example
"""

import logging
from datetime import datetime
from flask import Blueprint, jsonify, request
from addon_system import BaseAddon, AddonType

logger = logging.getLogger(__name__)

class Addon(BaseAddon):
    """Self-contained Hello World addon"""
    
    def __init__(self):
        super().__init__()
        self.info.addon_type = AddonType.CARD
    
    def get_default_settings(self):
        return {
            'show_toolbar_button': True,
            'show_card': True,
            'greeting_message': 'Hello, World!',
            'button_color': 'blue',
            'counter_value': 0
        }
    
    def get_settings_schema(self):
        return {
            'title': 'Hello World Settings',
            'description': 'Configure the Hello World addon',
            'sections': [
                {
                    'title': 'Display Options',
                    'fields': [
                        {
                            'name': 'show_toolbar_button',
                            'type': 'checkbox',
                            'label': 'Show Toolbar Button',
                            'description': 'Display hello button in toolbar'
                        },
                        {
                            'name': 'show_card',
                            'type': 'checkbox',
                            'label': 'Show Dashboard Card',
                            'description': 'Display card on dashboard'
                        },
                        {
                            'name': 'greeting_message',
                            'type': 'text',
                            'label': 'Greeting Message',
                            'description': 'Custom greeting text'
                        },
                        {
                            'name': 'button_color',
                            'type': 'select',
                            'label': 'Button Color',
                            'options': [
                                {'value': 'blue', 'label': 'Blue'},
                                {'value': 'green', 'label': 'Green'},
                                {'value': 'red', 'label': 'Red'}
                            ]
                        }
                    ]
                }
            ]
        }
    
    def get_toolbar_items(self):
        if not self.settings.get('show_toolbar_button', True):
            return []
        
        return [{
            'label': 'Hello',
            'icon': 'fas fa-hand-wave',
            'class': f'hello-btn btn-{self.settings.get("button_color", "blue")}',
            'tooltip': 'Hello World!',
            'action': 'helloWorldAction',
            'data': {'message': self.settings.get('greeting_message', 'Hello, World!')}
        }]
    
    def get_card_html(self):
        if not self.settings.get('show_card', True):
            return ""
        
        message = self.settings.get('greeting_message', 'Hello, World!')
        counter = self.settings.get('counter_value', 0)
        
        return f"""
        <div class="hello-world-card">
            <div class="hello-content">
                <h3><i class="fas fa-hand-wave"></i> {message}</h3>
                <p>This is a self-contained addon example!</p>
                <div class="hello-counter">
                    <span>Counter: <strong id="helloCounter">{counter}</strong></span>
                    <button class="btn btn-sm" onclick="incrementHelloCounter()">
                        <i class="fas fa-plus"></i> Click Me
                    </button>
                </div>
                <div class="hello-info">
                    <small>Hello World Addon v{self.info.version}</small>
                </div>
            </div>
        </div>
        """
    
    def get_card_javascript(self):
        if not self.settings.get('show_card', True):
            return ""
        
        return """
        <style>
        .hello-world-card {
            background: #4a4a4a;
            border: 1px solid #555;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .hello-content h3 {
            color: #fff;
            margin-bottom: 12px;
        }
        .hello-content p {
            color: #ccc;
            margin-bottom: 16px;
        }
        .hello-counter {
            background: rgba(0,0,0,0.3);
            padding: 12px;
            border-radius: 6px;
            margin: 12px 0;
        }
        .hello-counter span {
            color: #fff;
            margin-right: 12px;
        }
        .hello-info {
            color: #888;
            font-size: 0.8em;
            margin-top: 12px;
        }
        </style>
        
        <script>
        // Global functions for Hello World addon
        window.helloWorldAction = function(data) {
            if (typeof showAlert === 'function') {
                showAlert(data.message || 'Hello, World!', 'success');
            }
            if (typeof addConsoleMessage === 'function') {
                addConsoleMessage('Hello World clicked: ' + (data.message || 'Hello!'), 'info');
            }
        };
        
        window.incrementHelloCounter = function() {
            const counter = document.getElementById('helloCounter');
            if (counter) {
                let value = parseInt(counter.textContent) + 1;
                counter.textContent = value;
                
                // Save to backend
                fetch('/addons/hello_world/counter', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({counter_value: value})
                }).catch(e => console.error('Counter update failed:', e));
            }
        };
        
        console.log('Hello World addon loaded');
        </script>
        """
    
    def get_api_routes(self):
        addon_instance = self  # Reference to the addon instance
        hello_bp = Blueprint('hello_world_addon', __name__, url_prefix='/addons/hello_world')
        
        @hello_bp.route('/counter', methods=['POST'])
        def update_counter():
            try:
                data = request.get_json()
                addon_instance.settings['counter_value'] = data.get('counter_value', 0)
                addon_instance.save_settings()
                return jsonify({'success': True})
            except Exception as e:
                return jsonify({'success': False, 'error': str(e)}), 500
        
        return hello_bp
'''
                
                with open(hello_world_dir / "addon.py", 'w') as f:
                    f.write(addon_code)
                
                # Create empty requirements.txt
                with open(hello_world_dir / "requirements.txt", 'w') as f:
                    f.write("# No system dependencies required\n")
                
                logger.info("Created Hello World example addon")
                
            except Exception as e:
                logger.error(f"Failed to create Hello World example: {e}")
    
    def install_addon_from_upload(self, uploaded_file):
        """Install addon from uploaded ZIP file - completely self-contained"""
        try:
            # Save uploaded file temporarily
            temp_path = self.addon_directory / f"temp_{uploaded_file.filename}"
            uploaded_file.save(str(temp_path))
            
            # Install addon
            success, message = self.install_addon(temp_path)
            
            # Cleanup temp file
            if temp_path.exists():
                temp_path.unlink()
            
            return success, message
            
        except Exception as e:
            logger.error(f"Error installing uploaded addon: {e}")
            return False, str(e)
    
    def install_addon(self, zip_file_path):
        """Install addon from zip file"""
        try:
            temp_dir = self.addon_directory / "temp_install"
            temp_dir.mkdir(exist_ok=True)
            
            # Extract zip file
            with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
            
            # Find addon.json file to get addon info
            addon_json = None
            addon_py = None
            requirements_txt = None
            
            for root, dirs, files in os.walk(temp_dir):
                if 'addon.json' in files:
                    addon_json = Path(root) / 'addon.json'
                if 'addon.py' in files:
                    addon_py = Path(root) / 'addon.py'
                if 'requirements.txt' in files:
                    requirements_txt = Path(root) / 'requirements.txt'
            
            if not addon_json or not addon_py:
                raise Exception("Invalid addon: missing addon.json or addon.py")
            
            # Read addon info
            with open(addon_json, 'r') as f:
                addon_info = json.load(f)
            
            app_name = addon_info.get('app_name')
            if not app_name:
                raise Exception("Invalid addon: missing app_name in addon.json")
            
            # Install system dependencies
            if requirements_txt:
                self._install_dependencies(requirements_txt)
            
            # Move addon to final location
            final_dir = self.addon_directory / app_name
            if final_dir.exists():
                shutil.rmtree(final_dir)
            
            shutil.move(str(addon_py.parent), str(final_dir))
            
            # Cleanup temp directory
            shutil.rmtree(temp_dir)
            
            logger.info(f"Addon {app_name} installed successfully")
            return True, f"Addon {app_name} installed successfully"
            
        except Exception as e:
            logger.error(f"Failed to install addon: {e}")
            # Cleanup on failure
            if 'temp_dir' in locals() and temp_dir.exists():
                shutil.rmtree(temp_dir)
            return False, str(e)
    
    def _install_dependencies(self, requirements_file):
        """Install system dependencies using apt"""
        try:
            with open(requirements_file, 'r') as f:
                packages = [line.strip() for line in f if line.strip() and not line.startswith('#')]
            
            if packages:
                logger.info(f"Installing packages: {', '.join(packages)}")
                # Update package list first
                subprocess.run(['sudo', 'apt', 'update'], check=True, capture_output=True)
                # Install packages
                cmd = ['sudo', 'apt', 'install', '-y'] + packages
                subprocess.run(cmd, check=True, capture_output=True)
                logger.info("Dependencies installed successfully")
                
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to install dependencies: {e}")
            raise Exception(f"Failed to install dependencies: {e}")
        except Exception as e:
            logger.error(f"Error processing dependencies: {e}")
            raise
    
    def discover_addons(self):
        """Automatically discover all addons - no main app changes needed"""
        discovered = []
        
        for addon_dir in self.addon_directory.iterdir():
            if addon_dir.is_dir() and not addon_dir.name.startswith('_'):
                addon_file = addon_dir / "addon.py"
                addon_json = addon_dir / "addon.json"
                
                if addon_file.exists() and addon_json.exists():
                    try:
                        # Load addon info first
                        with open(addon_json, 'r') as f:
                            addon_info = json.load(f)
                        
                        spec = importlib.util.spec_from_file_location(
                            f"addon_{addon_dir.name}", 
                            addon_file
                        )
                        module = importlib.util.module_from_spec(spec)
                        spec.loader.exec_module(module)
                        
                        # Look for addon class
                        if hasattr(module, 'Addon'):
                            addon_instance = module.Addon()
                            if isinstance(addon_instance, BaseAddon):
                                # Update addon info from JSON
                                addon_instance.info.name = addon_info.get('name', addon_instance.info.name)
                                addon_instance.info.app_name = addon_info.get('app_name', addon_dir.name)
                                addon_instance.info.version = addon_info.get('version', addon_instance.info.version)
                                addon_instance.info.description = addon_info.get('description', addon_instance.info.description)
                                addon_instance.info.author = addon_info.get('author', addon_instance.info.author)
                                
                                self.addons[addon_dir.name] = addon_instance
                                discovered.append(addon_dir.name)
                                logger.info(f"Auto-discovered addon: {addon_instance.info.name}")
                            else:
                                logger.warning(f"Addon {addon_dir.name} does not inherit from BaseAddon")
                        else:
                            logger.warning(f"No Addon class found in {addon_dir.name}")
                            
                    except Exception as e:
                        logger.error(f"Failed to load addon {addon_dir.name}: {e}")
        
        return discovered
    
    def initialize_addons(self, app, printer_controller, file_manager):
        """Initialize all discovered addons automatically"""
        for name, addon in self.addons.items():
            try:
                addon_dir = self.addon_directory / name
                if addon.initialize(app, printer_controller, file_manager, addon_dir):
                    self.enabled_addons[name] = addon
                    logger.info(f"Auto-initialized addon: {addon.info.name}")
                else:
                    logger.warning(f"Failed to initialize addon: {name}")
            except Exception as e:
                logger.error(f"Error initializing addon {name}: {e}")
    
    def get_toolbar_items(self) -> List[Dict[str, Any]]:
        """Get all toolbar items from enabled addons"""
        items = []
        for addon in self.enabled_addons.values():
            if addon.info.addon_type in [AddonType.TOOLBAR, AddonType.CARD]:
                try:
                    addon_items = addon.get_toolbar_items()
                    if addon_items:
                        items.extend(addon_items)
                except Exception as e:
                    logger.error(f"Error getting toolbar items from {addon.info.name}: {e}")
        return items
    
    def get_card_addons(self) -> List[BaseAddon]:
        """Get all card-based addons"""
        return [
            addon for addon in self.enabled_addons.values() 
            if addon.info.addon_type == AddonType.CARD
        ]
    
    def get_api_routes(self):
        """Get all API routes from addons"""
        routes = []
        for addon in self.enabled_addons.values():
            try:
                addon_routes = addon.get_api_routes()
                if addon_routes:
                    routes.append(addon_routes)
            except Exception as e:
                logger.error(f"Error getting API routes from {addon.info.name}: {e}")
        return routes
    
    def start_background_tasks(self):
        """Start background tasks for all addons"""
        for addon in self.enabled_addons.values():
            if addon.info.addon_type == AddonType.BACKGROUND:
                try:
                    addon.start_background_task()
                except Exception as e:
                    logger.error(f"Error starting background task for {addon.info.name}: {e}")
    
    def stop_all_addons(self):
        """Stop and cleanup all addons"""
        for addon in self.enabled_addons.values():
            try:
                addon.stop_background_task()
                addon.cleanup()
            except Exception as e:
                logger.error(f"Error stopping addon {addon.info.name}: {e}")
        
        self.enabled_addons.clear()
    
    def get_addon_info(self) -> List[Dict[str, Any]]:
        """Get information about all addons"""
        return [
            {
                **addon.info.to_dict(),
                'enabled': name in self.enabled_addons
            }
            for name, addon in self.addons.items()
        ]
    
    def get_addon_settings(self, addon_name):
        """Get settings for a specific addon - supports multiple lookup methods"""
        # Try direct key lookup first
        if addon_name in self.addons:
            addon = self.addons[addon_name]
            return {
                'settings': addon.settings,
                'schema': addon.get_settings_schema()
            }
        
        # Try looking up by app_name
        for key, addon in self.addons.items():
            if addon.info.app_name == addon_name:
                return {
                    'settings': addon.settings,
                    'schema': addon.get_settings_schema()
                }
        
        # Try looking up by display name
        for key, addon in self.addons.items():
            if addon.info.name == addon_name:
                return {
                    'settings': addon.settings,
                    'schema': addon.get_settings_schema()
                }
        
        return None
    
    def update_addon_settings(self, addon_name, new_settings):
        """Update settings for a specific addon - supports multiple lookup methods"""
        # Try direct key lookup first
        if addon_name in self.addons:
            addon = self.addons[addon_name]
            return addon.update_settings(new_settings)
        
        # Try looking up by app_name
        for key, addon in self.addons.items():
            if addon.info.app_name == addon_name:
                return addon.update_settings(new_settings)
        
        # Try looking up by display name
        for key, addon in self.addons.items():
            if addon.info.name == addon_name:
                return addon.update_settings(new_settings)
        
        return False
    
    def remove_addon_completely(self, addon_identifier):
        """
        Completely remove an addon by identifier (name, app_name, or directory)
        Returns (success: bool, message: str, deleted_directory: str)
        """
        try:
            addon_key = None
            addon_directory = None
            
            logger.info(f"Attempting to find addon for removal: {addon_identifier}")
            
            # Find the addon and its directory
            # Try direct directory name first
            potential_dir = self.addon_directory / addon_identifier
            if potential_dir.exists() and potential_dir.is_dir():
                addon_key = addon_identifier
                addon_directory = potential_dir
                logger.info(f"Found addon by direct directory lookup: {addon_directory}")
            
            # Search by addon properties
            if not addon_directory:
                for key, addon in self.addons.items():
                    if (key == addon_identifier or 
                        addon.info.name == addon_identifier or
                        addon.info.app_name == addon_identifier):
                        addon_key = key
                        addon_directory = self.addon_directory / key
                        logger.info(f"Found addon by property lookup: {addon_directory}")
                        break
            
            # Try variations if still not found
            if not addon_directory:
                variations = [
                    addon_identifier.lower(),
                    addon_identifier.replace(' ', '_'),
                    addon_identifier.replace(' ', '_').lower(),
                    addon_identifier.replace('-', '_'),
                    addon_identifier.replace('-', '_').lower()
                ]
                
                for variation in variations:
                    potential_dir = self.addon_directory / variation
                    if potential_dir.exists() and potential_dir.is_dir():
                        addon_key = variation
                        addon_directory = potential_dir
                        logger.info(f"Found addon by variation '{variation}': {addon_directory}")
                        break
            
            if not addon_directory or not addon_directory.exists():
                logger.error(f"Addon directory not found for: {addon_identifier}")
                return False, f"Addon '{addon_identifier}' not found", ""
            
            # Disable if enabled
            if addon_key in self.enabled_addons:
                try:
                    addon = self.enabled_addons[addon_key]
                    addon.stop_background_task()
                    addon.cleanup()
                    del self.enabled_addons[addon_key]
                    logger.info(f"Disabled addon: {addon_key}")
                except Exception as e:
                    logger.warning(f"Error during addon cleanup: {e}")
            
            # Remove from addons dict
            if addon_key in self.addons:
                del self.addons[addon_key]
                logger.info(f"Removed addon from manager: {addon_key}")
            
            # Delete directory
            logger.info(f"Deleting addon directory: {addon_directory}")
            shutil.rmtree(addon_directory)
            
            # Verify deletion
            if addon_directory.exists():
                logger.error(f"Directory still exists after deletion: {addon_directory}")
                return False, f"Failed to delete addon directory: {addon_directory}", str(addon_directory)
            
            logger.info(f"Successfully removed addon: {addon_identifier}")
            return True, f"Addon '{addon_identifier}' removed successfully", str(addon_directory)
            
        except PermissionError as e:
            logger.error(f"Permission error removing addon: {e}")
            return False, f"Permission denied: {str(e)}", ""
        except Exception as e:
            logger.error(f"Error in remove_addon_completely: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return False, str(e), ""

def create_addon_routes(addon_manager):
    """Create Flask blueprint for self-contained addon management"""
    addon_bp = Blueprint('addons', __name__, url_prefix='/addons')
    
    @addon_bp.route('/list')
    def list_addons():
        """List all available addons"""
        return jsonify(addon_manager.get_addon_info())
    
    @addon_bp.route('/toolbar_items')
    def get_toolbar_items():
        """Get toolbar items from all addons"""
        return jsonify(addon_manager.get_toolbar_items())
    
    @addon_bp.route('/cards')
    def get_card_addons():
        """Get HTML and JS for card addons"""
        cards = []
        for addon in addon_manager.get_card_addons():
            try:
                card_data = {
                    'name': addon.info.name,
                    'app_name': addon.info.app_name,
                    'html': addon.get_card_html(),
                    'javascript': addon.get_card_javascript()
                }
                cards.append(card_data)
            except Exception as e:
                logger.error(f"Error getting card data from {addon.info.name}: {e}")
        
        return jsonify(cards)
    
    @addon_bp.route('/install', methods=['POST'])
    def install_addon():
        """Install addon from uploaded zip file - completely automatic"""
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        if not file.filename.endswith('.zip'):
            return jsonify({'success': False, 'error': 'Only ZIP files are supported'}), 400
        
        try:
            # Install addon automatically
            success, message = addon_manager.install_addon_from_upload(file)
            
            if success:
                # Automatically rediscover and initialize addons
                addon_manager.discover_addons()
                # Note: Full re-initialization would require app restart in production
                return jsonify({'success': True, 'message': message + ' (Restart required)'})
            else:
                return jsonify({'success': False, 'error': message}), 400
                
        except Exception as e:
            logger.error(f"Error installing addon: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @addon_bp.route('/<addon_name>/settings')
    def get_addon_settings(addon_name):
        """Get settings for a specific addon"""
        settings = addon_manager.get_addon_settings(addon_name)
        if settings:
            return jsonify(settings)
        else:
            return jsonify({'error': 'Addon not found'}), 404
    
    @addon_bp.route('/<addon_name>/settings', methods=['POST'])
    def update_addon_settings(addon_name):
        """Update settings for a specific addon"""
        new_settings = request.get_json()
        if not new_settings:
            return jsonify({'error': 'No settings provided'}), 400
        
        success = addon_manager.update_addon_settings(addon_name, new_settings)
        if success:
            return jsonify({'success': True, 'message': 'Settings updated'})
        else:
            return jsonify({'error': 'Failed to update settings'}), 500
    
    return addon_bp