// Relay Controller Addon - Toolbar Functions
// This file should be loaded globally by the addon system

// Global toolbar action handlers for relay controller
window.toggleRelay1 = function(data) {
    console.log('Relay 1 toolbar action triggered:', data);
    toggleRelay('relay_1', 'Light');
};

window.toggleRelay2 = function(data) {
    console.log('Relay 2 toolbar action triggered:', data);
    toggleRelay('relay_2', 'Fan');
};

window.toggleRelay3 = function(data) {
    console.log('Relay 3 toolbar action triggered:', data);
    toggleRelay('relay_3', 'Printer Power');
};

window.toggleRelay4 = function(data) {
    console.log('Relay 4 toolbar action triggered:', data);
    toggleRelay('relay_4', 'Relay 4');
};

function toggleRelay(relayId, relayName) {
    if (typeof showAlert === 'function') {
        showAlert('Toggling ' + relayName, 'info');
    }
    
    fetch('/addons/relay_controller/toggle/' + relayId, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (typeof showAlert === 'function') {
                showAlert(data.message, 'success');
            }
            console.log('Relay toggled successfully:', data);
        } else {
            if (typeof showAlert === 'function') {
                showAlert(data.message || 'Failed to toggle relay', 'error');
            }
            console.error('Relay toggle failed:', data);
        }
    })
    .catch(error => {
        console.error('Relay toggle error:', error);
        if (typeof showAlert === 'function') {
            showAlert('Network error', 'error');
        }
    });
}

console.log('✅ Relay Controller functions loaded: toggleRelay1, toggleRelay2, toggleRelay3, toggleRelay4'); 
