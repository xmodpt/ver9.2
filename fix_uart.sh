#!/bin/bash

# Quick UART Fix Script for Existing Installations
# This script fixes UART communication issues without full reinstallation

set -e

echo "🔧 Quick UART Fix for Pi Zero 2W"
echo "=================================="

# Check if running on Raspberry Pi
if [ ! -f /proc/device-tree/model ] || ! grep -q "Raspberry Pi" /proc/device-tree/model; then
    echo "❌ This script must be run on a Raspberry Pi"
    exit 1
fi

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

echo "📝 Configuring UART in /boot/config.txt..."

# Backup original config
cp /boot/config.txt /boot/config.txt.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup created: /boot/config.txt.backup.$(date +%Y%m%d_%H%M%S)"

# Enable UART
if ! grep -q "enable_uart=1" /boot/config.txt; then
    echo "enable_uart=1" >> /boot/config.txt
    echo "✅ Added enable_uart=1"
else
    echo "ℹ️  UART already enabled"
fi

# Disable Bluetooth UART
if ! grep -q "dtoverlay=disable-bt" /boot/config.txt; then
    echo "dtoverlay=disable-bt" >> /boot/config.txt
    echo "✅ Added dtoverlay=disable-bt"
else
    echo "ℹ️  Bluetooth UART already disabled"
fi

# Set UART clock
if ! grep -q "uart_clock=" /boot/config.txt; then
    echo "uart_clock=48000000" >> /boot/config.txt
    echo "✅ Added uart_clock=48000000"
else
    echo "ℹ️  UART clock already configured"
fi

# Remove console from serial0
if grep -q "console=serial0" /boot/config.txt; then
    sed -i 's/console=serial0,115200//' /boot/config.txt
    echo "✅ Removed console from serial0"
else
    echo "ℹ️  Console already removed from serial0"
fi

# Remove console from cmdline.txt if it exists
if [ -f /boot/cmdline.txt ]; then
    if grep -q "console=serial0" /boot/cmdline.txt; then
        sed -i 's/console=serial0,115200//' /boot/cmdline.txt
        echo "✅ Removed console from cmdline.txt"
    else
        echo "ℹ️  Console already removed from cmdline.txt"
    fi
fi

echo ""
echo "🔧 UART Configuration Summary:"
echo "   • UART enabled: enable_uart=1"
echo "   • Bluetooth UART disabled: dtoverlay=disable-bt"
echo "   • UART clock set: uart_clock=48000000"
echo "   • Console removed from serial0"
echo ""
echo "⚠️  IMPORTANT: You must reboot for changes to take effect!"
echo "   Run: sudo reboot"
echo ""
echo "📋 After reboot, test serial communication:"
echo "   • python3 test_serial.py"
echo "   • Or run your main application"
echo ""
echo "🔌 GPIO UART Pins (Pi Zero 2W):"
echo "   • TX (GPIO 14): Pin 8"
echo "   • RX (GPIO 15): Pin 10"
echo "   • GND: Any ground pin"
echo ""
echo "✅ UART fix completed!" 