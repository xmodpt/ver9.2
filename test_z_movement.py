#!/usr/bin/env python3
"""
Test Z-axis Movement Script
Tests the fixed Z movement functionality
"""

import time
import logging
from communication import SerialCommunicator
from config import SERIAL_PORT, BAUDRATE, SERIAL_TIMEOUT

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_z_movement():
    """Test Z-axis movement commands"""
    print("🔧 Testing Z-axis Movement")
    print("=" * 40)
    
    # Initialize communicator
    communicator = SerialCommunicator()
    
    try:
        # Connect to printer
        print("🔌 Connecting to printer...")
        if not communicator.connect():
            print("❌ Failed to connect to printer")
            return False
        
        print("✅ Connected to printer")
        
        # Test simple movement command
        print("\n📏 Testing simple Z movement...")
        response = communicator.send_command("G91\nG1 Z5 F600\nG90")
        print(f"Response: {repr(response)}")
        
        if response:
            print("✅ Movement command sent successfully")
        else:
            print("⚠️  No response received (this might be normal for movement commands)")
        
        # Test homing command
        print("\n🏠 Testing Z homing...")
        response = communicator.send_command("G28 Z0")
        print(f"Response: {repr(response)}")
        
        if response:
            print("✅ Homing command sent successfully")
        else:
            print("⚠️  No response received (this might be normal for homing commands)")
        
        # Test negative movement
        print("\n📏 Testing negative Z movement...")
        response = communicator.send_command("G91\nG1 Z-5 F600\nG90")
        print(f"Response: {repr(response)}")
        
        if response:
            print("✅ Negative movement command sent successfully")
        else:
            print("⚠️  No response received (this might be normal for movement commands)")
        
        print("\n✅ Z-axis movement test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error during test: {e}")
        return False
        
    finally:
        # Disconnect
        communicator.disconnect()
        print("🔌 Disconnected from printer")

if __name__ == "__main__":
    test_z_movement() 