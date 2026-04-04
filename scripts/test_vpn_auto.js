const { execSync } = require('child_process');
const axios = require('axios');

const VPNCMD_PATH = 'C:\\Program Files\\SoftEther VPN Client\\vpncmd_x64.exe';
const ACCOUNT_NAME = 'VPNGateTest';
const NIC_NAME = 'VPN';

function runVpnCmd(cmd) {
    console.log(`> vpncmd: ${cmd}`);
    try {
        const fullCmd = `"${VPNCMD_PATH}" localhost /CLIENT /CMD ${cmd}`;
        const output = execSync(fullCmd).toString();
        console.log(output);
        return output;
    } catch (e) {
        const err = e.stdout ? e.stdout.toString() : e.message;
        console.error(err);
        return err;
    }
}

async function testVpnAuto() {
    console.log('=== SoftEther Automatic Connection Test ===\n');

    try {
        console.log('[1] Fetching VPN List...');
        const response = await axios.get('https://www.vpngate.net/api/iphone/');
        const lines = response.data.split('\n');
        const japanNodes = lines.slice(2).filter(line => line.includes('Japan'));
        
        if (japanNodes.length === 0) throw new Error('No Japan nodes found.');
        
        const node = japanNodes[Math.floor(Math.random() * japanNodes.length)];
        const ip = node.split(',')[1];
        console.log(`Selected IP: ${ip}`);

        console.log('\n[2] Cleaning up old settings...');
        runVpnCmd(`AccountDisconnect ${ACCOUNT_NAME}`);
        runVpnCmd(`AccountDelete ${ACCOUNT_NAME}`);

        console.log('\n[3] Creating Account...');
        runVpnCmd(`AccountCreate ${ACCOUNT_NAME} /SERVER:${ip}:443 /HUB:VPNGATE /USERNAME:vpn /NICNAME:${NIC_NAME}`);
        runVpnCmd(`AccountPasswordSet ${ACCOUNT_NAME} /PASSWORD:vpn /TYPE:standard`);

        console.log('\n[4] Connecting...');
        runVpnCmd(`AccountConnect ${ACCOUNT_NAME}`);

        console.log('\n[5] Monitoring Status (60s)...');
        for (let i = 0; i < 20; i++) {
            const status = runVpnCmd(`AccountStatusGet ${ACCOUNT_NAME}`);
            if (status.includes('接続完了') || status.includes('Connected')) {
                console.log('\n!!! CONNECTED SUCCESSFULLY !!!');
                break;
            }
            console.log('Still connecting... wait 3s');
            await new Promise(r => setTimeout(r, 3000));
        }

        console.log('\n[6] Verifying IP address...');
        const ipRes = await axios.get('http://ip-api.com/json/').catch(() => ({data:{query:'Failed to fetch'}}));
        console.log(`Current IP: ${ipRes.data.query} (${ipRes.data.country || 'Unknown'})`);

        console.log('\n[7] Cleaning up...');
        runVpnCmd(`AccountDisconnect ${ACCOUNT_NAME}`);
        runVpnCmd(`AccountDelete ${ACCOUNT_NAME}`);

    } catch (e) {
        console.error('\nTest Failed:', e.message);
    }
}

testVpnAuto();
