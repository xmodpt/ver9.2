#!/bin/bash

# Fix Python Package Installation Script
# This script completes the Python package installation that may have failed

echo "🐍 Fixing Python Package Installation"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "app.py" ]; then
    echo "❌ app.py not found in current directory"
    echo "   Please run this script from the ver9 directory"
    exit 1
fi

echo "✅ Found app.py in current directory"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create virtual environment"
        exit 1
    fi
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

if [ $? -ne 0 ]; then
    echo "❌ Failed to activate virtual environment"
    exit 1
fi

echo "✅ Virtual environment activated"
echo "   Python path: $(which python)"
echo "   Python version: $(python --version)"

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip setuptools wheel

# Install core Python packages
echo "📦 Installing core Python packages..."
pip install \
    Flask==2.3.3 \
    Werkzeug==2.3.7 \
    Pillow==10.0.1 \
    pyserial==3.5 \
    psutil==5.9.5 \
    requests==2.31.0 \
    python-socketio==5.9.0 \
    eventlet==0.33.3 \
    gevent==23.7.0 \
    gevent-websocket==0.10.1

if [ $? -ne 0 ]; then
    echo "❌ Failed to install core packages"
    exit 1
fi

echo "✅ Core packages installed"

# Install addon-specific packages
echo "📦 Installing addon-specific packages..."

# Pi Monitor Addon
pip install psutil>=5.8.0

# Relay Controller Addon (only on Pi)
if [ -f "/proc/device-tree/model" ] && grep -q "Raspberry Pi" /proc/device-tree/model; then
    echo "📦 Installing RPi.GPIO for Raspberry Pi..."
    pip install RPi.GPIO
else
    echo "⚠️  Not on Raspberry Pi - skipping RPi.GPIO"
fi

# Install additional useful packages
echo "📦 Installing additional utilities..."
pip install \
    python-dotenv==1.0.0 \
    click==8.1.7 \
    colorama==0.4.6 \
    tabulate==0.9.0 \
    watchdog==3.0.0

echo "✅ All Python packages installed"

# Test Flask installation
echo "🧪 Testing Flask installation..."
python -c "import flask; print(f'✅ Flask {flask.__version__} imported successfully')"

if [ $? -ne 0 ]; then
    echo "❌ Flask import test failed"
    exit 1
fi

# Test other critical packages
echo "🧪 Testing other packages..."
python -c "import serial; print('✅ pyserial imported successfully')"
python -c "import psutil; print('✅ psutil imported successfully')"
python -c "from PIL import Image; print('✅ Pillow imported successfully')"

# Create requirements.txt
echo "📝 Creating requirements.txt..."
pip freeze > requirements.txt
echo "✅ requirements.txt created"

# Deactivate virtual environment
deactivate

echo ""
echo "🎉 Python Package Installation Complete!"
echo "======================================"
echo ""
echo "✅ Virtual environment: venv/"
echo "✅ All required packages installed"
echo "✅ requirements.txt created"
echo ""
echo "🚀 To run your application:"
echo "   source venv/bin/activate"
echo "   python app.py"
echo ""
echo "📦 Or use the startup script:"
echo "   ./start_app.sh"
echo ""
echo "Your Flask application should now work! 🎊" 