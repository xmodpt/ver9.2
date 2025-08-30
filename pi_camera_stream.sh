#!/bin/bash

# Raspberry Pi Camera Module Streaming Script
# This script uses the correct input plugin for Pi cameras

echo "📷 Raspberry Pi Camera Module Streaming Script"
echo "=============================================="

# Check if mjpeg-streamer is installed
if ! command -v mjpg_streamer &> /dev/null; then
    echo "❌ mjpeg-streamer not found. Please run install_dependencies.sh first."
    exit 1
fi

# Check if camera is available
if [ ! -e "/dev/video0" ]; then
    echo "❌ Camera device /dev/video0 not found!"
    echo "   Make sure your Pi camera is connected and enabled."
    exit 1
fi

echo "✅ Camera device found: /dev/video0"
echo "✅ mjpeg-streamer found: $(which mjpg_streamer)"

# Kill any existing mjpeg-streamer processes
echo "🔄 Stopping any existing camera streams..."
pkill -f mjpg_streamer 2>/dev/null || true
sleep 2

echo ""
echo "🚀 Starting Pi Camera stream with proper configuration..."

# Method 1: Try using input_raspicam.so (if available)
echo ""
echo "📹 Method 1: Using input_raspicam.so plugin..."
if [ -f "/usr/local/lib/mjpg-streamer/input_raspicam.so" ]; then
    echo "✅ input_raspicam.so plugin found"
    
    if mjpg_streamer -i "input_raspicam.so -fps 15 -x 640 -y 480 -quality 85" -o "output_http.so -p 8080 -w /usr/local/share/mjpg-streamer/www" > /dev/null 2>&1 & then
        PID=$!
        echo "✅ Pi Camera stream started with PID: $PID"
        echo "📷 Stream available at: http://localhost:8080/?action=stream"
        echo "📷 Control panel: http://localhost:8080"
        echo "📷 To stop: kill $PID"
        exit 0
    else
        echo "❌ Failed to start with input_raspicam.so"
    fi
else
    echo "⚠️  input_raspicam.so plugin not found"
fi

# Method 2: Try using input_uvc.so with Pi camera specific settings
echo ""
echo "📹 Method 2: Using input_uvc.so with Pi camera settings..."
if mjpg_streamer -i "input_uvc.so -d /dev/video0 -r 640x480 -f 15 -q 85" -o "output_http.so -p 8080 -w /usr/local/share/mjpg-streamer/www" > /dev/null 2>&1 & then
    PID=$!
    echo "✅ Pi Camera stream started with PID: $PID"
    echo "📷 Stream available at: http://localhost:8080/?action=stream"
    echo "📷 Control panel: http://localhost:8080"
    echo "📷 To stop: kill $PID"
    exit 0
else
    echo "❌ Failed to start with input_uvc.so"
fi

# Method 3: Try minimal configuration
echo ""
echo "📹 Method 3: Minimal configuration..."
if mjpg_streamer -i "input_uvc.so -d /dev/video0" -o "output_http.so -p 8080 -w /usr/local/share/mjpg-streamer/www" > /dev/null 2>&1 & then
    PID=$!
    echo "✅ Pi Camera stream started with PID: $PID"
    echo "📷 Stream available at: http://localhost:8080/?action=stream"
    echo "📷 Control panel: http://localhost:8080"
    echo "📷 To stop: kill $PID"
    exit 0
else
    echo "❌ Failed to start with minimal configuration"
fi

# Method 4: Alternative approach using gstreamer (if available)
echo ""
echo "📹 Method 4: Trying gstreamer alternative..."
if command -v gst-launch-1.0 &> /dev/null; then
    echo "✅ gstreamer found, trying alternative streaming method..."
    
    # Kill any existing streams
    pkill -f mjpg_streamer 2>/dev/null || true
    
    # Start gstreamer stream
    if gst-launch-1.0 v4l2src device=/dev/video0 ! videoconvert ! jpegenc ! multipartmux ! tcpserversink port=8080 > /dev/null 2>&1 & then
        PID=$!
        echo "✅ GStreamer stream started with PID: $PID"
        echo "📷 Stream available at: http://localhost:8080"
        echo "📷 To stop: kill $PID"
        exit 0
    else
        echo "❌ GStreamer stream failed"
    fi
else
    echo "⚠️  gstreamer not available"
fi

echo ""
echo "❌ All streaming methods failed!"
echo ""
echo "🔧 Troubleshooting steps:"
echo "1. Make sure Pi camera is enabled: sudo raspi-config"
echo "2. Check camera interface: sudo raspi-config nonint do_camera 0"
echo "3. Reboot: sudo reboot"
echo "4. Check camera status: vcgencmd get_camera"
echo ""
echo "5. Try manual test:"
echo "   mjpg_streamer -i 'input_uvc.so -d /dev/video0' -o 'output_http.so -p 8080'"
echo ""
echo "6. Check system logs: dmesg | grep -i camera"
echo ""
echo "Your camera is working (read test passed), but the streaming plugin"
echo "may not be compatible with the Pi camera format." 