#!/usr/bin/env python3
"""
USB gadget management for g_mass_storage
"""

import subprocess
import logging
import time
from pathlib import Path
from config import USB_IMAGE_PATH, USB_MODULE_NAME, USB_MODULE_PARAMS, USB_DRIVE_MOUNT

logger = logging.getLogger(__name__)

class USBManager:
    """
    Manages USB gadget functionality using g_mass_storage
    """
    
    def __init__(self):
        self.usb_image_path = Path(USB_IMAGE_PATH)
        self.mount_point = USB_DRIVE_MOUNT
        self.module_name = USB_MODULE_NAME
        self.module_params = USB_MODULE_PARAMS
    
    def check_installation(self):
        """Check if USB gadget is properly installed"""
        try:
            # Check for USB image file
            usb_image_exists = self.usb_image_path.exists()
            mount_point_exists = self.mount_point.exists()
            
            # Check if g_mass_storage is configured in rc.local
            rc_local_configured = False
            try:
                with open('/etc/rc.local', 'r') as f:
                    rc_local_configured = self.module_name in f.read()
            except:
                pass
            
            # Check if mount is in fstab
            fstab_configured = False
            try:
                with open('/etc/fstab', 'r') as f:
                    fstab_configured = str(self.usb_image_path) in f.read()
            except:
                pass
            
            installed = all([usb_image_exists, mount_point_exists, rc_local_configured, fstab_configured])
            
            return {
                'installed': installed,
                'setup_type': self.module_name,
                'components': {
                    'usb_image': usb_image_exists,
                    'mount_point': mount_point_exists,
                    'rc_local': rc_local_configured,
                    'fstab': fstab_configured
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to check USB installation: {e}")
            return {'error': str(e), 'installed': False}
    
    def get_status(self):
        """Get current USB gadget status"""
        try:
            # Check if module is loaded
            result = subprocess.run(['lsmod'], capture_output=True, text=True)
            service_active = self.module_name in result.stdout
            
            # Check if mount point is mounted
            mounted = False
            if self.mount_point.exists():
                try:
                    result = subprocess.run(['mountpoint', '-q', str(self.mount_point)], 
                                          capture_output=True)
                    mounted = result.returncode == 0
                except:
                    try:
                        with open('/proc/mounts', 'r') as f:
                            mount_data = f.read()
                            mounted = str(self.mount_point) in mount_data
                    except:
                        mounted = False
            
            return {
                'service_running': service_active,
                'mounted': mounted,
                'mount_point': str(self.mount_point),
                'setup_type': self.module_name
            }
            
        except Exception as e:
            logger.error(f"Failed to get USB status: {e}")
            return {'error': str(e)}
    
    def start_gadget(self):
        """Start USB gadget"""
        try:
            cmd = ['sudo', 'modprobe', self.module_name] + self.module_params
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info("USB Gadget started successfully")
                return {'success': True, 'message': 'USB Gadget started'}
            else:
                logger.error(f"Failed to start USB gadget: {result.stderr}")
                return {'success': False, 'error': result.stderr}
                
        except Exception as e:
            logger.error(f"Failed to start USB gadget: {e}")
            return {'success': False, 'error': str(e)}
    
    def stop_gadget(self):
        """Stop USB gadget"""
        try:
            result = subprocess.run(['sudo', 'rmmod', self.module_name], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                logger.info("USB Gadget stopped successfully")
                return {'success': True, 'message': 'USB Gadget stopped'}
            else:
                logger.error(f"Failed to stop USB gadget: {result.stderr}")
                return {'success': False, 'error': result.stderr}
                
        except Exception as e:
            logger.error(f"Failed to stop USB gadget: {e}")
            return {'success': False, 'error': str(e)}
    
    def recover_from_error(self):
        """Recover from USB/Memory errors"""
        try:
            logger.info("Attempting USB error recovery...")
            
            # Step 1: Clear memory caches
            try:
                subprocess.run(['sudo', 'sh', '-c', 'echo 1 > /proc/sys/vm/drop_caches'], 
                             capture_output=True, text=True)
            except Exception as e:
                logger.debug(f"Memory cache clear failed: {e}")
                
            # Step 2: Reset USB communication
            try:
                # Stop gadget
                subprocess.run(['sudo', 'rmmod', self.module_name], 
                             capture_output=True, text=True)
                time.sleep(2)
                
                # Restart gadget
                cmd = ['sudo', 'modprobe', self.module_name] + self.module_params
                subprocess.run(cmd, capture_output=True, text=True)
                time.sleep(3)
                
            except Exception as e:
                logger.warning(f"USB module restart failed: {e}")
                
            logger.info("USB error recovery completed")
            return {
                'success': True, 
                'message': 'USB error recovery completed. Memory cleared and USB reloaded.'
            }
            
        except Exception as e:
            logger.error(f"USB error recovery failed: {e}")
            return {'success': False, 'error': str(e)}