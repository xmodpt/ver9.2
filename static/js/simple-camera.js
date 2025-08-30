/**
 * Simple Camera Handler for External MJPEG Stream
 * Handles the external camera stream with dynamic IP detection
 */

// Camera stream management
let cameraStreamImg = null;

// Initialize camera when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('📹 Initializing simple camera handler...');
    initializeCamera();
});

function initializeCamera() {
    cameraStreamImg = document.getElementById('cameraStream');
    
    if (cameraStreamImg) {
        console.log('📹 Camera stream element found');
    } else {
        console.warn('📹 Camera stream element not found');
    }
}

function refreshCameraStream() {
    console.log('📹 Refreshing camera stream');
    if (cameraStreamImg) {
        cameraStreamImg.src = cameraStreamImg.src.split('&t=')[0] + '&t=' + Date.now();
    }
    
    const overlayImg = document.getElementById('overlayCameraStream');
    if (overlayImg) {
        overlayImg.src = overlayImg.src.split('&t=')[0] + '&t=' + Date.now();
    }
}

// Camera test function for settings
window.testCameraStream = function() {
    console.log('📹 Testing camera stream...');
    refreshCameraStream();
    showAlert('Camera stream refreshed', 'info');
};

// Function to update camera stream URL
window.updateCameraStreamUrl = function(newUrl) {
    console.log('📹 Updating camera stream URL:', newUrl);
    
    // Update main camera stream
    if (cameraStreamImg) {
        cameraStreamImg.src = newUrl + '&t=' + Date.now();
    }
    
    // Update overlay camera stream
    const overlayImg = document.getElementById('overlayCameraStream');
    if (overlayImg) {
        overlayImg.src = newUrl + '&t=' + Date.now();
    }
};

// Export functions for global access
window.refreshCameraStream = refreshCameraStream;
window.updateCameraStreamUrl = updateCameraStreamUrl; 