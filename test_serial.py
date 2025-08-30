#!/usr/bin/env python3
"""
Serial Communication Test Script
Tests serial communication on various ports to diagnose connection issues
"""

import serial
import time
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Test ports in order of preference
TEST_PORTS = [
    "/dev/serial0",    # GPIO UART primary
    "/dev/ttyAMA0",    # Direct hardware UART
    "/dev/serial1",    # Alternative GPIO UART
    "/dev/ttyUSB0",    # USB adapter
    "/dev/ttyACM0"     # USB CDC device
]

# Test baudrates
TEST_BAUDRATES = [115200, 9600, 250000, 500000]

def test_port(port, baudrate=115200, timeout=2):
    """Test if a serial port can be opened and communicate"""
    try:
        logger.info(f"Testing {port} at {baudrate} baud...")
        
        # Try to open the port
        ser = serial.Serial(
            port=port,
            baudrate=baudrate,
            timeout=timeout,
            exclusive=False
        )
        
        if ser.is_open:
            logger.info(f"✅ Successfully opened {port}")
            
            # Test basic communication
            try:
                # Clear buffers
                ser.reset_input_buffer()
                ser.reset_output_buffer()
                
                # Send a simple command
                test_command = "M4002\n"  # Hello command
                ser.write(test_command.encode('latin-1'))
                ser.flush()
                
                # Wait for response
                time.sleep(1)
                
                # Check if there's any data
                if ser.in_waiting > 0:
                    response = ser.read(ser.in_waiting).decode('latin-1', errors='ignore')
                    logger.info(f"✅ Received response: {repr(response)}")
                else:
                    logger.warning(f"⚠️  No response received from {port}")
                
                # Close connection
                ser.close()
                return True, f"Port {port} working at {baudrate} baud"
                
            except Exception as e:
                ser.close()
                return False, f"Communication error on {port}: {e}"
        else:
            return False, f"Could not open {port}"
            
    except serial.SerialException as e:
        return False, f"Serial error on {port}: {e}"
    except Exception as e:
        return False, f"Unexpected error on {port}: {e}"

def check_system_info():
    """Check system information relevant to serial communication"""
    logger.info("🔍 Checking system information...")
    
    # Check if running on Raspberry Pi
    if Path("/proc/device-tree/model").exists():
        with open("/proc/device-tree/model", "r") as f:
            model = f.read().strip()
            logger.info(f"📱 Device: {model}")
    else:
        logger.warning("⚠️  Not running on Raspberry Pi")
    
    # Check UART configuration
    if Path("/boot/config.txt").exists():
        logger.info("📋 Checking /boot/config.txt for UART settings...")
        try:
            with open("/boot/config.txt", "r") as f:
                config = f.read()
                uart_enabled = "enable_uart=1" in config
                bt_disabled = "dtoverlay=disable-bt" in config
                console_removed = "console=serial0" not in config
                
                logger.info(f"   • UART enabled: {'✅' if uart_enabled else '❌'}")
                logger.info(f"   • Bluetooth disabled: {'✅' if bt_disabled else '❌'}")
                logger.info(f"   • Console removed: {'✅' if console_removed else '❌'}")
                
        except Exception as e:
            logger.error(f"Error reading config.txt: {e}")
    
    # Check available serial devices
    logger.info("🔌 Checking available serial devices...")
    for device in Path("/dev").glob("serial*"):
        logger.info(f"   • {device}")
    
    for device in Path("/dev").glob("tty*"):
        if "tty" in str(device) and any(x in str(device) for x in ["AMA", "USB", "ACM"]):
            logger.info(f"   • {device}")

def main():
    """Main test function"""
    print("🔧 Serial Communication Test Script")
    print("=" * 50)
    
    # Check system info
    check_system_info()
    print()
    
    # Test each port
    working_ports = []
    
    for port in TEST_PORTS:
        print(f"🔌 Testing {port}...")
        
        # Test with different baudrates
        for baudrate in TEST_BAUDRATES:
            success, message = test_port(port, baudrate)
            if success:
                logger.info(f"✅ {message}")
                working_ports.append((port, baudrate))
                break
            else:
                logger.warning(f"❌ {message}")
        
        print()
    
    # Summary
    print("📊 Test Results Summary:")
    print("=" * 30)
    
    if working_ports:
        print("✅ Working ports:")
        for port, baudrate in working_ports:
            print(f"   • {port} at {baudrate} baud")
    else:
        print("❌ No working serial ports found")
        print()
        print("🔧 Troubleshooting steps:")
        print("1. Run: sudo ./setup_uart.sh")
        print("2. Reboot: sudo reboot")
        print("3. Check GPIO connections (TX: Pin 8, RX: Pin 10, GND)")
        print("4. Verify ESP32 is powered and communicating")
    
    print()
    print("🔌 GPIO UART Pins (Pi Zero 2W):")
    print("   • TX (GPIO 14): Pin 8")
    print("   • RX (GPIO 15): Pin 10")
    print("   • GND: Any ground pin")

if __name__ == "__main__":
    main() 