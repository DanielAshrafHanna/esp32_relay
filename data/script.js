let updateInterval;

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
        console.error('Failed to load WiFi info:', error);
    }
}

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

async function resetConfig() {
    if (!confirm('Are you sure you want to reset WiFi configuration? The device will restart.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/reset', {
            method: 'POST'
        });
        
        if (response.ok) {
            alert('WiFi settings reset. The device will restart and enter configuration mode.');
            
            clearInterval(updateInterval);
            
            document.body.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">
                    <h1>Device Restarting...</h1>
                    <p>Reconnect to the setup AP and configure WiFi again.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to reset configuration:', error);
        alert('Reset failed. Please try again.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadWiFiInfo();

    updateInterval = setInterval(() => {
        loadWiFiInfo();
    }, 2000);

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetConfig);
    }
});

window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});





