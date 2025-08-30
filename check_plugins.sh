#!/bin/bash

# Check available mjpeg-streamer plugins and camera status
echo "🔍 MJPEG-Streamer Plugin and Camera Diagnostic Script"
echo "======================================================"

# Check mjpeg-streamer installation
echo "📦 MJPEG-Streamer Installation Status:"
if command -v mjpg_streamer &> /dev/null; then
    echo "✅ mjpg_streamer executable found: $(which mjpg_streamer)"
    echo "✅ Version: $(mjpg_streamer --help | head -1)"
else
    echo "❌ mjpg_streamer not found in PATH"
    exit 1
fi

echo ""
echo "🔌 Available Input Plugins:"
PLUGIN_DIR="/usr/local/lib/mjpg-streamer"
if [ -d "$PLUGIN_DIR" ]; then
    echo "✅ Plugin directory found: $PLUGIN_DIR"
    echo ""
    echo "📹 Input plugins:"
    ls -la "$PLUGIN_DIR"/input_*.so 2>/dev/null | while read line; do
        echo "   $line"
    done
    
    echo ""
    echo "📹 Output plugins:"
    ls -la "$PLUGIN_DIR"/output_*.so 2>/dev/null | while read line; do
        echo "   $line"
    done
else
    echo "❌ Plugin directory not found: $PLUGIN_DIR"
fi

echo ""
echo "📷 Camera Device Status:"
if [ -e "/dev/video0" ]; then
    echo "✅ Camera device found: /dev/video0"
    
    # Check camera capabilities
    echo ""
    echo "🔍 Camera capabilities:"
    v4l2-ctl --all -d /dev/video0 2>/dev/null | grep -E "(Driver name|Card type|Bus info|Capabilities)" || echo "   Could not read camera capabilities"
    
    # Check camera status
    echo ""
    echo "📊 Camera status:"
    if command -v vcgencmd &> /dev/null; then
        echo "   $(vcgencmd get_camera)"
    else
        echo "   vcgencmd not available (not on Pi or not in PATH)"
    fi
    
    # Check if camera is enabled
    echo ""
    echo "🔧 Camera interface status:"
    if [ -f "/boot/config.txt" ]; then
        if grep -q "camera_auto_detect=1" /boot/config.txt; then
            echo "   ✅ Camera auto-detect enabled"
        elif grep -q "dtoverlay=imx219" /boot/config.txt; then
            echo "   ✅ IMX219 camera overlay enabled"
        elif grep -q "dtoverlay=ov5647" /boot/config.txt; then
            echo "   ✅ OV5647 camera overlay enabled"
        else
            echo "   ⚠️  No specific camera overlay found in config.txt"
        fi
    else
        echo "   ⚠️  /boot/config.txt not found"
    fi
    
else
    echo "❌ Camera device not found: /dev/video0"
    echo ""
    echo "🔧 Troubleshooting steps:"
    echo "1. Enable camera interface: sudo raspi-config nonint do_camera 0"
    echo "2. Reboot: sudo reboot"
    echo "3. Check camera connection"
    echo "4. Check /boot/config.txt for camera settings"
fi

echo ""
echo "🚀 Testing Camera Access:"
echo "📹 Testing read access..."
if timeout 5 dd if=/dev/video0 of=/dev/null bs=1M count=1 2>/dev/null; then
    echo "✅ Camera read test successful"
else
    echo "❌ Camera read test failed"
fi

echo ""
echo "🔍 System Information:"
echo "   OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo "   Kernel: $(uname -r)"
echo "   Architecture: $(uname -m)"

echo ""
echo "📋 Next Steps:"
echo "1. If camera is not enabled: sudo raspi-config nonint do_camera 0"
echo "2. If camera is enabled but not working: sudo reboot"
echo "3. Check camera connection and ribbon cable"
echo "4. Try the pi_camera_stream.sh script for streaming"
echo "5. Check system logs: dmesg | grep -i camera" 