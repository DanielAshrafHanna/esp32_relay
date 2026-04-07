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
        loadWiFiInfo();  // Also refresh uptime
    }, 2000);
    
    // Set up reset button
    document.getElementById('wifi-setup-btn').addEventListener('click', launchWiFiSetupPortal);
    document.getElementById('reset-btn').addEventListener('click', resetConfig);
    document.getElementById('factory-reset-btn').addEventListener('click', factoryReset);
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

// Format uptime in human-readable format
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0 || days > 0) result += `${hours}h `;
    if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
    result += `${secs}s`;
    
    return result;
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
        document.getElementById('uptime').textContent = formatUptime(data.uptime);
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
    if (!confirm('Are you sure you want to reset WiFi settings? The device will restart and return to setup mode.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/reset', {
            method: 'POST'
        });
        
        if (response.ok) {
            alert('Configuration reset. The device will restart and enter configuration mode. Connect to the WiFi network named "Aywana-Hub-Setup-XXXXXX" using the last 6 hex digits of the board MAC address.');
            
            // Stop updates
            clearInterval(updateInterval);
            
            // Show loading message
            document.body.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">
                    <h1>Aywana Hub Restarting...</h1>
                    <p>Please connect to the "Aywana-Hub-Setup-XXXXXX" WiFi using the last 6 hex digits of the board MAC address.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error resetting config:', error);
        alert('Failed to reset configuration. Please try again.');
    }
}

async function launchWiFiSetupPortal() {
    if (!confirm('Reboot into the WiFi setup portal now? The device will restart and open WiFiManager at 192.168.4.1.')) {
        return;
    }

    try {
        const response = await fetch('/api/wifi/setup-portal', {
            method: 'POST'
        });

        if (response.ok) {
            alert('Aywana Hub is rebooting into the WiFi setup portal. Reconnect to the setup WiFi if needed, then open 192.168.4.1.');

            clearInterval(updateInterval);

            document.body.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">
                    <h1>Opening WiFi Setup Portal...</h1>
                    <p>Aywana Hub is restarting into WiFiManager.</p>
                    <p>After reboot, open <strong>192.168.4.1</strong>.</p>
                </div>
            `;
        } else {
            alert('Failed to launch the WiFi setup portal.');
        }
    } catch (error) {
        console.error('Error launching WiFi setup portal:', error);
        alert('Failed to launch the WiFi setup portal. Please try again.');
    }
}

async function factoryReset() {
    const confirmation = prompt('Type RESET to erase WiFi, MQTT, relay states, RF codes, and saved board settings.');
    if (confirmation !== 'RESET') {
        return;
    }

    try {
        const response = await fetch('/api/factory-reset', {
            method: 'POST'
        });

        if (response.ok) {
            alert('Factory reset complete. The device will restart and return to the setup access point "Aywana-Hub-Setup-XXXXXX" using the last 6 hex digits of the board MAC address.');

            clearInterval(updateInterval);

            document.body.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">
                    <h1>Aywana Hub Factory Reset In Progress...</h1>
                    <p>Reconnect to the "Aywana-Hub-Setup-XXXXXX" access point using the last 6 hex digits of the board MAC address.</p>
                </div>
            `;
        } else {
            alert('Failed to factory reset the device.');
        }
    } catch (error) {
        console.error('Error factory resetting config:', error);
        alert('Failed to factory reset the device. Please try again.');
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});
