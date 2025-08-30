#!/bin/bash

# Resin Printer Control Application - Dependency Installation Script
# This script installs Python and all required packages for the application
# Includes mjpeg-streamer for Pi camera functionality

set -e  # Exit on any error

echo "🚀 Starting installation of dependencies for Resin Printer Control Application..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on Raspberry Pi
check_pi() {
    if [ -f /proc/device-tree/model ]; then
        if grep -q "Raspberry Pi" /proc/device-tree/model; then
            print_success "Raspberry Pi detected"
            return 0
        fi
    fi
    print_warning "This may not be a Raspberry Pi - some features may not work"
    return 1
}

# Check system type and version
check_system() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        print_status "Detected OS: $NAME $VERSION"
        
        # Check if it's Ubuntu/Debian/Raspbian
        if [[ "$ID" == "ubuntu" || "$ID" == "debian" || "$ID" == "raspbian" ]]; then
            print_success "Ubuntu/Debian/Raspbian system detected - package names compatible"
            return 0
        else
            print_warning "Non-Ubuntu/Debian/Raspbian system detected - package names may differ"
            return 1
        fi
    else
        print_warning "Could not determine OS type"
        return 1
    fi
}

# Update system packages
update_system() {
    print_status "Updating system packages..."
    sudo apt update
    sudo apt upgrade -y
    print_success "System packages updated"
}

# Install Python and pip
install_python() {
    print_status "Installing Python and pip..."
    
    # Check if Python 3 is already installed
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
        print_status "Python 3 already installed: $PYTHON_VERSION"
    else
        sudo apt install -y python3 python3-pip python3-venv
        print_success "Python 3 and pip installed"
    fi
    
    # Install additional Python development packages
    sudo apt install -y python3-dev python3-setuptools python3-wheel
    print_success "Python development packages installed"
}

# Install system dependencies for Python packages
install_system_deps() {
    print_status "Installing system dependencies for Python packages..."
    
    # Core system dependencies - essential packages
    sudo apt install -y \
        build-essential \
        libffi-dev \
        libssl-dev \
        libjpeg-dev \
        libpng-dev \
        libtiff-dev \
        libfreetype6-dev \
        liblcms2-dev \
        libwebp-dev \
        libopenjp2-7-dev \
        libatlas-base-dev \
        libgfortran5 \
        libhdf5-dev \
        gfortran \
        wget \
        curl \
        git \
        unzip \
        zip \
        htop \
        vim \
        nano
    
    # Try to install Qt5 packages (may not be available on all systems)
    print_status "Installing Qt5 development packages..."
    if sudo apt install -y qtchooser libqt5core5a libqt5webkit5-dev libqt5test5 python3-pyqt5 2>/dev/null; then
        print_success "Qt5 packages installed"
    else
        print_warning "Qt5 packages not available - skipping"
    fi
    
    # Try to install GTK and multimedia packages
    print_status "Installing GTK and multimedia packages..."
    if sudo apt install -y libgtk-3-dev libavcodec-dev libavformat-dev libswscale-dev libv4l-dev libxvidcore-dev libx264-dev libjasper-dev 2>/dev/null; then
        print_success "GTK and multimedia packages installed"
    else
        print_warning "Some GTK/multimedia packages not available - continuing"
    fi
    
    print_success "System dependencies installed"
}

# Install mjpeg-streamer for Pi camera
install_mjpeg_streamer() {
    print_status "Installing mjpeg-streamer for Pi camera..."
    
    # Check if mjpeg-streamer is already installed
    if command -v mjpg_streamer &> /dev/null; then
        print_status "mjpeg-streamer already installed"
        return 0
    fi
    
    # Install mjpeg-streamer dependencies with fallback for newer systems
    print_status "Installing mjpeg-streamer dependencies..."
    
    # Try to install libjpeg development package (with fallback)
    if sudo apt install -y libjpeg9-dev 2>/dev/null; then
        print_success "libjpeg9-dev installed"
    elif sudo apt install -y libjpeg62-turbo-dev 2>/dev/null; then
        print_success "libjpeg62-turbo-dev installed"
    elif sudo apt install -y libjpeg8-dev 2>/dev/null; then
        print_success "libjpeg8-dev installed"
    else
        print_warning "Could not install libjpeg development package - trying alternative approach"
    fi
    
    # Install other dependencies
    sudo apt install -y \
        cmake \
        libgif-dev \
        pkg-config
    
    # Try to install optional dependencies (may not be available on all systems)
    print_status "Installing optional dependencies..."
    if sudo apt install -y libopencv-dev 2>/dev/null; then
        print_success "OpenCV development package installed"
    else
        print_warning "OpenCV development package not available - continuing without it"
    fi
    
    if sudo apt install -y libgtk2.0-dev 2>/dev/null; then
        print_success "GTK2 development package installed"
    else
        print_warning "GTK2 development package not available - continuing without it"
    fi
    
    # Clone and build mjpeg-streamer
    print_status "Building mjpeg-streamer from source..."
    cd /tmp
    if [ -d "mjpg-streamer" ]; then
        rm -rf mjpg-streamer
    fi
    
    git clone https://github.com/jacksonliam/mjpg-streamer.git
    cd mjpg-streamer/mjpg-streamer-experimental
    
    # Build mjpeg-streamer
    make clean
    make
    sudo make install
    
    # Create symlink for easy access
    sudo ln -sf /usr/local/bin/mjpg_streamer /usr/local/bin/mjpg_streamer
    
    # Clean up
    cd /
    rm -rf /tmp/mjpg-streamer
    
    print_success "mjpeg-streamer installed successfully"
}

# Install Pi camera dependencies
install_pi_camera_deps() {
    if check_pi; then
        print_status "Installing Pi camera dependencies..."
        
        # Enable camera interface
        sudo raspi-config nonint do_camera 0
        
        # Install camera-related packages
        sudo apt install -y \
            python3-picamera2 \
            python3-picamera \
            python3-opencv \
            python3-numpy \
            python3-pil \
            python3-pil.imagetk
        
        print_success "Pi camera dependencies installed"
    else
        print_warning "Skipping Pi camera dependencies (not on Raspberry Pi)"
    fi
}

# Install USB and serial communication dependencies
install_communication_deps() {
    print_status "Installing USB and serial communication dependencies..."
    
    sudo apt install -y \
        usbutils \
        usbmount \
        pmount \
        python3-serial \
        python3-pyserial \
        libusb-1.0-0-dev \
        libusb-1.0-0 \
        udev \
        udev-extraconf
    
    print_success "Communication dependencies installed"
}

# Create virtual environment and install Python packages
install_python_packages() {
    print_status "Setting up Python virtual environment..."
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        print_success "Virtual environment created"
    else
        print_status "Virtual environment already exists"
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip setuptools wheel
    
    # Install core Python packages
    print_status "Installing core Python packages..."
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
    
    # Install addon-specific packages
    print_status "Installing addon-specific packages..."
    
    # Pi Monitor Addon
    pip install psutil>=5.8.0
    
    # Relay Controller Addon (only on Pi)
    if check_pi; then
        pip install RPi.GPIO
    else
        print_warning "Skipping RPi.GPIO (not on Raspberry Pi)"
    fi
    
    # Install additional useful packages
    pip install \
        python-dotenv==1.0.0 \
        click==8.1.7 \
        colorama==0.4.6 \
        tabulate==0.9.0 \
        watchdog==3.0.0
    
    print_success "Python packages installed"
    
    # Deactivate virtual environment
    deactivate
}

# Create requirements.txt file
create_requirements_file() {
    print_status "Creating requirements.txt file..."
    
    # Create requirements.txt with conditional RPi.GPIO
    if check_pi; then
        cat > requirements.txt << 'EOF'
# Core Application Dependencies
Flask==2.3.3
Werkzeug==2.3.7
Pillow==10.0.1
pyserial==3.5
psutil==5.9.5
requests==2.31.0
python-socketio==5.9.0
eventlet==0.33.3
gevent==23.7.0
gevent-websocket==0.10.1

# Addon Dependencies
# Pi Monitor Addon
psutil>=5.8.0

# Relay Controller Addon (Raspberry Pi only)
RPi.GPIO

# Additional Utilities
python-dotenv==1.0.0
click==8.1.7
colorama==0.4.6
tabulate==0.9.0
watchdog==3.0.0
EOF
    else
        cat > requirements.txt << 'EOF'
# Core Application Dependencies
Flask==2.3.3
Werkzeug==2.3.7
Pillow==10.0.1
pyserial==3.5
psutil==5.9.5
requests==2.31.0
python-socketio==5.9.0
eventlet==0.33.3
gevent==23.7.0
gevent-websocket==0.10.1

# Addon Dependencies
# Pi Monitor Addon
psutil>=5.8.0

# Relay Controller Addon (Raspberry Pi only)
# RPi.GPIO

# Additional Utilities
python-dotenv==1.0.0
click==8.1.7
colorama==0.4.6
tabulate==0.9.0
watchdog==3.0.0
EOF
    fi
    
    print_success "requirements.txt created"
}

# Display package installation summary
show_package_summary() {
    echo ""
    echo "=========================================="
    echo "📦 PACKAGE INSTALLATION SUMMARY"
    echo "=========================================="
    echo ""
    echo "✅ Core Python Packages:"
    echo "   • Flask (Web framework)"
    echo "   • pyserial (Serial communication)"
    echo "   • Pillow (Image processing)"
    echo "   • psutil (System monitoring)"
    echo "   • requests (HTTP client)"
    echo "   • python-socketio (WebSocket support)"
    echo ""
    
    if check_pi; then
        echo "✅ Raspberry Pi Specific Packages:"
        echo "   • RPi.GPIO (GPIO control)"
        echo "   • python3-picamera2 (Camera support)"
        echo "   • mjpeg-streamer (Camera streaming)"
        echo ""
    fi
    
    echo "✅ System Dependencies:"
    echo "   • Build tools (gcc, make, cmake)"
    echo "   • Image libraries (libjpeg, libpng, libtiff)"
    echo "   • USB and serial communication tools"
    echo "   • Development libraries"
    echo ""
    echo "✅ Addon Support:"
    echo "   • Pi Monitor Addon (psutil)"
    echo "   • Relay Controller Addon (RPi.GPIO on Pi)"
    echo ""
}

# Setup USB mount points
setup_usb_mounts() {
    print_status "Setting up USB mount points..."
    
    # Create USB mount directory
    sudo mkdir -p /mnt/usb-share
    sudo chmod 755 /mnt/usb-share
    
    # Create alternative mount point in user directory
    mkdir -p ~/usb_share
    
    # Create fallback mount point in current directory
    mkdir -p ./usb_share
    
    print_success "USB mount points created"
}

# Create startup script
create_startup_script() {
    print_status "Creating startup script..."
    
    cat > start_app.sh << 'EOF'
#!/bin/bash

# Resin Printer Control Application Startup Script

echo "🚀 Starting Resin Printer Control Application..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run install_dependencies.sh first."
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check if mjpeg-streamer is available
if command -v mjpg_streamer &> /dev/null; then
    echo "📷 Starting mjpeg-streamer for camera..."
    
    # Try different camera input methods for Bayer format cameras
    echo "📷 Attempting to start camera stream..."
    
    # Method 1: Try with Bayer format and let mjpeg-streamer handle conversion
    if mjpg_streamer -i "input_uvc.so -d /dev/video0 -r 640x480 -f 15 -fps 15" -o "output_http.so -p 8080 -w /usr/local/share/mjpg-streamer/www" > /dev/null 2>&1 & then
        MJPEG_PID=$!
        echo "📷 mjpeg-streamer started with PID: $MJPEG_PID (Bayer format)"
    # Method 2: Try with different resolution and frame rate
    elif mjpg_streamer -i "input_uvc.so -d /dev/video0 -r 1296x972 -f 10" -o "output_http.so -p 8080 -w /usr/local/share/mjpg-streamer/www" > /dev/null 2>&1 & then
        MJPEG_PID=$!
        echo "📷 mjpeg-streamer started with PID: $MJPEG_PID (alternative resolution)"
    # Method 3: Try with minimal parameters
    elif mjpg_streamer -i "input_uvc.so -d /dev/video0" -o "output_http.so -p 8080 -w /usr/local/share/mjpg-streamer/www" > /dev/null 2>&1 & then
        MJPEG_PID=$!
        echo "📷 mjpeg-streamer started with PID: $MJPEG_PID (minimal config)"
    else
        echo "⚠️  Could not start mjpeg-streamer - camera may need different configuration"
        MJPEG_PID=""
    fi
    
    if [ ! -z "$MJPEG_PID" ]; then
        echo "📷 Camera stream available at: http://localhost:8080"
        echo "📷 Try accessing: http://localhost:8080/?action=stream"
    fi
else
    echo "⚠️  mjpeg-streamer not found - camera functionality may not work"
fi

# Start the Flask application
echo "🌐 Starting Flask application..."
python app.py

# Cleanup on exit
if [ ! -z "$MJPEG_PID" ]; then
    echo "📷 Stopping mjpeg-streamer..."
    kill $MJPEG_PID 2>/dev/null || true
fi

echo "👋 Application stopped"
EOF
    
    chmod +x start_app.sh
    print_success "Startup script created: start_app.sh"
}

# Create systemd service file
create_systemd_service() {
    if check_pi; then
        print_status "Creating systemd service file..."
        
        # Get current user and working directory
        CURRENT_USER=$(whoami)
        CURRENT_DIR=$(pwd)
        
        cat > resin-printer-control.service << EOF
[Unit]
Description=Resin Printer Control Application
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
ExecStart=$CURRENT_DIR/start_app.sh
Restart=always
RestartSec=10
Environment=PATH=$CURRENT_DIR/venv/bin

[Install]
WantedBy=multi-user.target
EOF
        
        print_success "Systemd service file created: resin-printer-control.service"
        print_status "To install as a service, run:"
        echo "sudo cp resin-printer-control.service /etc/systemd/system/"
        echo "sudo systemctl daemon-reload"
        echo "sudo systemctl enable resin-printer-control"
        echo "sudo systemctl start resin-printer-control"
    fi
}

# Main installation function
main() {
    echo "=========================================="
    echo "Resin Printer Control Application Installer"
    echo "=========================================="
    echo ""
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        print_error "Please do not run this script as root. Run as a regular user."
        exit 1
    fi
    
    # Check if sudo is available
    if ! command -v sudo &> /dev/null; then
        print_error "sudo is not available. Please install it first."
        exit 1
    fi
    
    # Check system type
    check_system
    
    # Update system
    update_system
    
    # Install Python
    install_python
    
    # Install system dependencies
    install_system_deps
    
    # Install mjpeg-streamer
    install_mjpeg_streamer
    
    # Install Pi camera dependencies
    install_pi_camera_deps
    
    # Install communication dependencies
    install_communication_deps
    
    # Install Python packages
    install_python_packages
    
    # Create requirements file
    create_requirements_file
    
    # Show package summary
    show_package_summary
    
    # Setup USB mounts
    setup_usb_mounts
    
    # Create startup script
    create_startup_script
    
    # Create systemd service
    create_systemd_service
    
    echo ""
    echo "=========================================="
    print_success "Installation completed successfully!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Run the application: ./start_app.sh"
    echo "2. Or install as a service (Raspberry Pi only):"
    echo "   sudo cp resin-printer-control.service /etc/systemd/system/"
    echo "   sudo systemctl daemon-reload"
    echo "   sudo systemctl enable resin-printer-control"
    echo "   sudo systemctl start resin-printer-control"
    echo ""
    echo "The application will be available at: http://localhost:5000"
    echo "Camera stream will be available at: http://localhost:8080"
    echo ""
    echo "Happy printing! 🖨️"
}

# Run main function
main "$@" 