// State management
let relaysData = [];
let updateInterval;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadRelays();
    loadWiFiInfo();
    loadMQTTInfo();
    
    // Set up auto-refresh every 2 seconds
    updateInterval = setInterval(() => {
        loadRelays();
        loadMQTTInfo();
    }, 2000);
    
    // Set up reset button
    document.getElementById('reset-btn').addEventListener('click', resetConfig);
});

// Load relay states
async function loadRelays() {
    try {
        const response = await fetch('/api/relays');
        const data = await response.json();
        relaysData = data.relays;
        renderRelays();
    } catch (error) {
        console.error('Error loading relays:', error);
    }
}

// Render relay cards
function renderRelays() {
    const container = document.getElementById('relays-container');
    
    if (relaysData.length === 0) {
        container.innerHTML = '<p>Loading relays...</p>';
        return;
    }
    
    container.innerHTML = relaysData.map(relay => `
        <div class="relay-card ${relay.state ? 'active' : ''}" data-relay-id="${relay.id}">
            <div class="relay-header">
                <span class="relay-name">${relay.name}</span>
                <span class="relay-id">R${relay.id}</span>
            </div>
            <div class="relay-info">
                <span>GPIO Pin: ${relay.pin}</span>
                <span class="relay-state ${relay.state ? 'on' : 'off'}">
                    ${relay.state ? 'ON' : 'OFF'}
                </span>
            </div>
            <button class="relay-toggle ${relay.state ? 'on' : ''}" 
                    onclick="toggleRelay(${relay.id}, ${!relay.state})">
                ${relay.state ? 'Turn OFF' : 'Turn ON'}
            </button>
        </div>
    `).join('');
}

// Toggle relay state
async function toggleRelay(relayId, newState) {
    try {
        const response = await fetch('/api/relay', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                relay: relayId,
                state: newState
            })
        });
        
        if (response.ok) {
            // Immediately update UI
            const relayIndex = relaysData.findIndex(r => r.id === relayId);
            if (relayIndex !== -1) {
                relaysData[relayIndex].state = newState;
                renderRelays();
            }
            
            // Reload to confirm
            setTimeout(loadRelays, 100);
        } else {
            console.error('Failed to toggle relay');
        }
    } catch (error) {
        console.error('Error toggling relay:', error);
    }
}

// Load WiFi information
async function loadWiFiInfo() {
    try {
        const response = await fetch('/api/wifi');
        const data = await response.json();
        
        // Update header
        document.getElementById('wifi-ssid').textContent = data.ssid;
        document.getElementById('wifi-ip').textContent = data.ip;
        updateSignalStrength(data.rssi);
        
        // Update info section
        document.getElementById('hostname').textContent = data.hostname;
        document.getElementById('info-ssid').textContent = data.ssid;
        document.getElementById('info-ip').textContent = data.ip;
        document.getElementById('info-rssi').textContent = data.rssi;
    } catch (error) {
        console.error('Error loading WiFi info:', error);
    }
}

// Update WiFi signal strength indicator
function updateSignalStrength(rssi) {
    const signalElement = document.getElementById('wifi-signal');
    if (rssi > -50) {
        signalElement.textContent = '📶';
        signalElement.title = 'Excellent';
    } else if (rssi > -60) {
        signalElement.textContent = '📶';
        signalElement.title = 'Good';
    } else if (rssi > -70) {
        signalElement.textContent = '📶';
        signalElement.title = 'Fair';
    } else {
        signalElement.textContent = '📶';
        signalElement.title = 'Weak';
    }
}

// Load MQTT information
async function loadMQTTInfo() {
    try {
        const response = await fetch('/api/mqtt');
        const data = await response.json();
        
        // Update header status
        const statusBadge = document.getElementById('mqtt-status');
        statusBadge.textContent = data.connected ? 'Connected' : 'Disconnected';
        statusBadge.className = `status-badge ${data.connected ? 'connected' : 'disconnected'}`;
        
        // Update info section
        document.getElementById('mqtt-server').textContent = data.server || 'Not configured';
        document.getElementById('mqtt-port').textContent = data.port || '--';
        document.getElementById('mqtt-connected').textContent = data.connected ? 'Connected' : 'Disconnected';
    } catch (error) {
        console.error('Error loading MQTT info:', error);
    }
}

// Reset configuration
async function resetConfig() {
    if (!confirm('Are you sure you want to reset WiFi and MQTT configuration? The device will restart.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/reset', {
            method: 'POST'
        });
        
        if (response.ok) {
            alert('Configuration reset. The device will restart and enter configuration mode. Connect to the WiFi network "ESP32-Relay-Setup" to reconfigure.');
            
            // Stop updates
            clearInterval(updateInterval);
            
            // Show loading message
            document.body.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">
                    <h1>Device Restarting...</h1>
                    <p>Please connect to "ESP32-Relay-Setup" WiFi to reconfigure.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error resetting config:', error);
        alert('Failed to reset configuration. Please try again.');
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});





