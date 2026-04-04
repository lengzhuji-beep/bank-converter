const { execSync } = require('child_process');
const fs = require('fs');

const VPNCMD_PATH = 'C:\\Program Files\\SoftEther VPN Client\\vpncmd_x64.exe';

function runVpnCmd(cmd) {
    console.log(`\nExecuting: vpncmd /CMD ${cmd}`);
    try {
        // Use 'binary' encoding to avoid UTF-8 mangling, then convert from CP932
        const raw = execSync(`"${VPNCMD_PATH}" localhost /CLIENT /CMD ${cmd}`, { encoding: 'buffer' });
        // Very basic way to see if it's readable, we'll just print it and let user copy-paste
        return raw.toString('binary'); 
    } catch (e) {
        return e.stdout ? e.stdout.toString() : e.message;
    }
}

async function debugVpn() {
    console.log('=== SoftEther Deep Inspection (Manual Connection Analysis) ===');
    console.log('Please ensure you are MANUALLY CONNECTED to a VPN before running this.\n');

    // 1. List accounts to find the manual one
    const accounts = runVpnCmd('AccountList');
    console.log('--- Account List ---');
    console.log(accounts);

    // 2. Identify the active one and get status
    const statuses = runVpnCmd('AccountStatusGet'); 
    // This without name shows all or current? Actually needs name.
    // We will try common names or just ask the user to see the output.
    console.log('--- Detailed Status (Attempting to find active session) ---');
    console.log(statuses);

    // 3. Inspect NICs
    const nics = runVpnCmd('NicList');
    console.log('--- Virtual NIC List ---');
    console.log(nics);
    
    console.log('\n--- Script End ---');
    console.log('Please COPY and PASTE the entire output above into the chat.');
}

debugVpn();
