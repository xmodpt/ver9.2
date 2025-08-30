#!/usr/bin/env python3
"""
Configuration settings for Resin Printer Control Application
"""

import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# USB Drive Configuration - with permission handling
def setup_usb_mount():
    """Setup USB mount directory with proper error handling"""
    mount_path = Path("/mnt/usb-share")
    
    try:
        # Try to create with sudo if needed
        if not mount_path.exists():
            mount_path.mkdir(parents=True, exist_ok=True)
        return mount_path
    except PermissionError:
        logger.warning(f"Cannot create {mount_path}, trying alternative location")
        # Fallback to user directory
        alt_path = Path.home() / "usb_share"
        alt_path.mkdir(exist_ok=True)
        logger.info(f"Using alternative USB mount: {alt_path}")
        return alt_path
    except Exception as e:
        logger.error(f"Error setting up USB mount: {e}")
        # Final fallback to current directory
        fallback_path = Path("./usb_share")
        fallback_path.mkdir(exist_ok=True)
        logger.info(f"Using fallback USB mount: {fallback_path}")
        return fallback_path

USB_DRIVE_MOUNT = setup_usb_mount()

# File Settings
ALLOWED_EXTENSIONS = {'.ctb', '.cbddlp', '.pwmx', '.pwmo', '.pwms', '.pws', '.pw0', '.pwx'}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB

# Serial Communication Settings - ESP32 via GPIO
SERIAL_PORT = "/dev/serial0"  # GPIO UART for ESP32 connection
BAUDRATE = 115200
SERIAL_TIMEOUT = 5.0

# Fallback serial ports (in order of preference)
SERIAL_FALLBACK_PORTS = [
    "/dev/serial0",    # GPIO UART primary
    "/dev/ttyAMA0",    # Direct hardware UART
    "/dev/serial1",    # Alternative GPIO UART
    "/dev/ttyUSB0",    # USB adapter
    "/dev/ttyACM0"     # USB CDC device
]

# Flask Settings
FLASK_HOST = '0.0.0.0'
FLASK_PORT = 5000

# Printer Settings
DEFAULT_FIRMWARE_VERSION = "V4.13"
MONITORING_INTERVAL = 3  # seconds
COMMUNICATION_TIMEOUT_MULTIPLIER = 3  # for USB operations

# USB Gadget Settings
USB_IMAGE_PATH = "/piusb.bin"
USB_MODULE_NAME = "g_mass_storage"
USB_MODULE_PARAMS = [
    'file=/piusb.bin',
    'removable=1',
    'ro=0',
    'stall=0',
    'nofua=1',
    'cdrom=0'
]

# Camera Configuration
def get_local_ip_address():
    """Get the local IP address of this Pi"""
    import socket
    try:
        # Create a socket to get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Connect to a remote address (doesn't actually connect)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception as e:
        logger.warning(f"Could not determine local IP: {e}")
        # Fallback to localhost
        return "127.0.0.1"

# Camera settings
CAMERA_PORT = 8080
CAMERA_BASE_URL = f"http://{get_local_ip_address()}:{CAMERA_PORT}"
CAMERA_STREAM_URL = f"{CAMERA_BASE_URL}/?action=stream"
CAMERA_SNAPSHOT_URL = f"{CAMERA_BASE_URL}/?action=snapshot"