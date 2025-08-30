#!/bin/bash

# Camera Troubleshooting and Fix Script for Bayer Format Cameras
# This script helps resolve issues with cameras that don't support MJPG format

echo "🔧 Camera Troubleshooting Script for Bayer Format Cameras"
echo "========================================================"

# Check if camera device exists
if [ ! -e "/dev/video0" ]; then
    echo "❌ Camera device /dev/video0 not found!"
    echo "   Make sure your camera is connected and recognized."
    exit 1
fi

echo "✅ Camera device found: /dev/video0"

# Check available formats
echo ""
echo "📷 Available camera formats:"
v4l2-ctl --list-formats-ext -d /dev/video0

echo ""
echo "🔍 Camera capabilities:"
v4l2-ctl --all -d /dev/video0 | grep -E "(Driver name|Card type|Bus info|Capabilities)"

echo ""
echo "🛠️  Attempting to fix camera format issues..."

# Method 1: Try to set camera to a supported format
echo ""
echo "📹 Method 1: Setting camera to 640x480 resolution..."
v4l2-ctl -d /dev/video0 --set-fmt-video=width=640,height=480,pixelformat=BA81

# Method 2: Try to set frame rate
echo ""
echo "📹 Method 2: Setting frame rate to 15 fps..."
v4l2-ctl -d /dev/video0 --set-parm=15

# Method 3: Check if we can read from camera
echo ""
echo "📹 Method 3: Testing camera read capability..."
if timeout 5 dd if=/dev/video0 of=/dev/null bs=1M count=1 2>/dev/null; then
    echo "✅ Camera read test successful"
else
    echo "⚠️  Camera read test failed - may need different approach"
fi

echo ""
echo "🚀 Now trying to start mjpeg-streamer with different configurations..."

# Try different mjpeg-streamer configurations
echo ""
echo "📹 Configuration 1: Minimal parameters (let camera choose format)..."
if mjpg_streamer -i "input_uvc.so -d /dev/video0" -o "output_http.so -p 8080 -w /usr/local/share/mjpg-streamer/www" > /dev/null 2>&1 & then
    PID1=$!
    echo "✅ Started with PID: $PID1"
    sleep 2
    if kill -0 $PID1 2>/dev/null; then
        echo "✅ Configuration 1 is working!"
        echo "📷 Camera stream available at: http://localhost:8080/?action=stream"
        echo "📷 To stop: kill $PID1"
    else
        echo "❌ Configuration 1 failed"
        kill $PID1 2>/dev/null
    fi
else
    echo "❌ Could not start configuration 1"
fi

echo ""
echo "📹 Configuration 2: With specific resolution (640x480)..."
if mjpg_streamer -i "input_uvc.so -d /dev/video0 -r 640x480" -o "output_http.so -p 8080 -w /usr/local/share/mjpg-streamer/www" > /dev/null 2>&1 & then
    PID2=$!
    echo "✅ Started with PID: $PID2"
    sleep 2
    if kill -0 $PID2 2>/dev/null; then
        echo "✅ Configuration 2 is working!"
        echo "📷 Camera stream available at: http://localhost:8080/?action=stream"
        echo "📷 To stop: kill $PID2"
    else
        echo "❌ Configuration 2 failed"
        kill $PID2 2>/dev/null
    fi
else
    echo "❌ Could not start configuration 2"
fi

echo ""
echo "📹 Configuration 3: With lower frame rate (10 fps)..."
if mjpg_streamer -i "input_uvc.so -d /dev/video0 -r 640x480 -f 10" -o "output_http.so -p 8080 -w /usr/local/share/mjpg-streamer/www" > /dev/null 2>&1 & then
    PID3=$!
    echo "✅ Started with PID: $PID3"
    sleep 2
    if kill -0 $PID3 2>/dev/null; then
        echo "✅ Configuration 3 is working!"
        echo "📷 Camera stream available at: http://localhost:8080/?action=stream"
        echo "📷 To stop: kill $PID3"
    else
        echo "❌ Configuration 3 failed"
        kill $PID3 2>/dev/null
    fi
else
    echo "❌ Could not start configuration 3"
fi

echo ""
echo "📹 Configuration 4: Alternative resolution (1296x972)..."
if mjpg_streamer -i "input_uvc.so -d /dev/video0 -r 1296x972 -f 10" -o "output_http.so -p 8080 -w /usr/local/share/mjpg-streamer/www" > /dev/null 2>&1 & then
    PID4=$!
    echo "✅ Started with PID: $PID4"
    sleep 2
    if kill -0 $PID4 2>/dev/null; then
        echo "✅ Configuration 4 is working!"
        echo "📷 Camera stream available at: http://localhost:8080/?action=stream"
        echo "📷 To stop: kill $PID4"
    else
        echo "❌ Configuration 4 failed"
        kill $PID4 2>/dev/null
    fi
else
    echo "❌ Could not start configuration 4"
fi

echo ""
echo "🔧 Troubleshooting Summary:"
echo "============================"
echo ""
echo "Your camera supports these formats:"
echo "• BA81 (8-bit Bayer) - 640x480"
echo "• pBAA (10-bit Bayer) - Multiple resolutions"
echo "• BG10 (10-bit Bayer) - Multiple resolutions"
echo ""
echo "The issue is that mjpeg-streamer expects JPEG input, but your camera"
echo "provides raw Bayer format. mjpeg-streamer should handle the conversion"
echo "internally, but it may need specific parameters to work properly."
echo ""
echo "If none of the configurations work, you may need to:"
echo "1. Use a different camera input plugin"
echo "2. Convert the Bayer format to JPEG first"
echo "3. Use a different streaming solution"
echo ""
echo "Try accessing: http://localhost:8080/?action=stream"
echo "in your web browser to see if any configuration worked." 