#!/usr/bin/env python3
"""
Test File Selection and Printing Script
Tests the file selection and printing functionality
"""

import time
import logging
from printer_controller import PrinterController

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_file_selection():
    """Test file selection and printing process"""
    print("🔧 Testing File Selection and Printing")
    print("=" * 50)
    
    # Initialize printer controller
    printer_controller = PrinterController()
    
    try:
        # Connect to printer
        print("🔌 Connecting to printer...")
        if not printer_controller.connect():
            print("❌ Failed to connect to printer")
            return False
        
        print("✅ Connected to printer")
        
        # Test file selection
        test_filename = "test_file.ctb"
        print(f"\n📁 Testing file selection: {test_filename}")
        
        success = printer_controller.select_file(test_filename)
        if success:
            print(f"✅ File selection successful: {test_filename}")
            print(f"   Selected file: {printer_controller.selected_file}")
        else:
            print(f"❌ File selection failed: {test_filename}")
            return False
        
        # Test printing
        print(f"\n🖨️ Testing print start: {test_filename}")
        success = printer_controller.start_printing()
        if success:
            print(f"✅ Print started successfully: {test_filename}")
        else:
            print(f"❌ Print start failed: {test_filename}")
        
        print("\n✅ File selection and printing test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error during test: {e}")
        return False
        
    finally:
        # Disconnect
        printer_controller.disconnect()
        print("🔌 Disconnected from printer")

if __name__ == "__main__":
    test_file_selection() 