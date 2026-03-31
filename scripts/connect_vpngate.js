const { execSync } = require('child_process');
const axios = require('axios');

const VPNCMD_PATH = 'C:\\Program Files\\SoftEther VPN Client\\vpncmd_x64.exe';
const ACCOUNT_NAME = 'VPNGateAuto';

async function connectVpnGate() {
    console.log('--- VPN Gate Auto Connector ---');
    
    try {
        // 1. Fetch Japanese VPN
        console.log('Fetching Japan VPN list...');
        const url = 'https://www.vpngate.net/api/iphone/';
        const response = await axios.get(url);
        const lines = response.data.split('\n');
        
        const headers = lines[1].split(',');
        const countryIndex = headers.indexOf('CountryLong');
        const ipIndex = headers.indexOf('IP');

        const japanNodes = lines.slice(2)
            .filter(line => line.split(',')[countryIndex] === 'Japan');

        if (japanNodes.length === 0) throw new Error('No Japanese nodes found.');

        const randomNode = japanNodes[Math.floor(Math.random() * japanNodes.length)];
        const ip = randomNode.split(',')[ipIndex];
        console.log(`Selected IP: ${ip}`);

        // 2. Helper to run vpncmd
        const runVpnCmd = (cmd) => {
            try {
                const fullCmd = `"${VPNCMD_PATH}" localhost /CLIENT /CMD ${cmd}`;
                console.log(`Executing: ${cmd}`);
                return execSync(fullCmd).toString();
            } catch (e) {
                return e.stdout ? e.stdout.toString() : e.message;
            }
        };

        // 3. Configure SoftEther
        console.log('Configuring SoftEther VPN Client...');
        runVpnCmd(`AccountDisconnect ${ACCOUNT_NAME}`);
        runVpnCmd(`AccountDelete ${ACCOUNT_NAME}`);
        
        const createResult = runVpnCmd(`AccountCreate ${ACCOUNT_NAME} /SERVER:${ip}:443 /HUB:VPN /USERNAME:vpn /NICNAME:VPN`);
        if (createResult.includes('エラー')) console.log('Create Error:', createResult);

        runVpnCmd(`AccountPasswordSet ${ACCOUNT_NAME} /PASSWORD:vpn /TYPE:standard`);
        
        // 4. Connect
        console.log(`Connecting to ${ACCOUNT_NAME}...`);
        runVpnCmd(`AccountConnect ${ACCOUNT_NAME}`);

        console.log('\nDone! Please check your VPN Client UI to verify connection status.');
        console.log('You can run your batch automation once the status shows "Connected".');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

connectVpnGate();
