const { execSync } = require('child_process');
const fs = require('fs');

const VPNCMD_PATH = 'C:\\Program Files\\SoftEther VPN Client\\vpncmd_x64.exe';
const TEMP_VPN_FILE = 'manual_exported.vpn';

function runVpnCmd(cmd) {
    try {
        const psCmd = `powershell -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & '${VPNCMD_PATH}' localhost /CLIENT /CMD ${cmd}"`;
        return execSync(psCmd, { encoding: 'utf8' });
    } catch (e) {
        return e.stdout ? e.stdout.toString('utf8') : e.message;
    }
}

async function analyze() {
    console.log('=== VPN Manual Connection Cloner ===');
    console.log('Detecting your manual connection settings...\n');

    // Use AccountGet instead of Export for better reliability
    const config = runVpnCmd('AccountGet "VPN Gate Connection"');
    
    if (!config.includes('エラー')) {
        console.log('SUCCESS: Settings retrieved.');
        console.log('\n--- Full Configuration Detail ---');
        console.log(config);
        console.log('---------------------------------\n');
    } else {
        console.error('FAILED: Could not retrieve settings.');
        console.log('Check your Account List:');
        console.log(runVpnCmd('AccountList'));
    }
}

analyze();
