const { execSync } = require('child_process');

const VPNCMD_PATH = 'C:\\Program Files\\SoftEther VPN Client\\vpncmd_x64.exe';
const ACCOUNT_NAME = 'VPNGateAuto';

function runVpnCmd(cmd) {
    console.log(`Executing: ${cmd}`);
    try {
        const fullCmd = `"${VPNCMD_PATH}" localhost /CLIENT /CMD ${cmd}`;
        const output = execSync(fullCmd).toString();
        console.log('--- OUTPUT ---');
        console.log(output);
        console.log('--------------');
        return output;
    } catch (e) {
        const err = e.stdout ? e.stdout.toString() : e.message;
        console.error('--- ERROR ---');
        console.error(err);
        console.error('-------------');
        return err;
    }
}

async function verifyDisconnect() {
    console.log('\n=== VPN Disconnect Verification ===');
    
    console.log('\n[1] Attempting AccountDisconnect...');
    runVpnCmd(`AccountDisconnect ${ACCOUNT_NAME}`);
    
    console.log('\n[2] Attempting AccountDelete...');
    runVpnCmd(`AccountDelete ${ACCOUNT_NAME}`);
    
    console.log('\n[3] Checking remaining accounts...');
    runVpnCmd('AccountList');
    
    console.log('\nVerification finished.');
}

verifyDisconnect();
