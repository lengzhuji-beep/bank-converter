const { execSync } = require('child_process');

const VPNCMD_PATH = 'C:\\Program Files\\SoftEther VPN Client\\vpncmd_x64.exe';

function runVpnCmd(cmd) {
    try {
        const fullCmd = `"${VPNCMD_PATH}" localhost /CLIENT /CMD ${cmd}`;
        return execSync(fullCmd).toString();
    } catch (e) {
        return e.stdout ? e.stdout.toString() : e.message;
    }
}

console.log('=== Checking VPN Virtual NICs ===');
const output = runVpnCmd('NicList');
console.log(output);
console.log('=================================');
