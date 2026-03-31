const axios = require('axios');

/**
 * Fetches the VPN Gate server list and returns a random Japanese node.
 */
const fs = require('fs');

async function getRandomJapanVpn() {
    const isJson = process.argv.includes('--json');
    const fileArgIndex = process.argv.indexOf('--file');
    const filePath = fileArgIndex !== -1 ? process.argv[fileArgIndex + 1] : null;

    if (!isJson && !filePath) console.log('Fetching VPN Gate server list...');
    const url = 'https://www.vpngate.net/api/iphone/';
    
    try {
        const response = await axios.get(url);
        const lines = response.data.split('\n');
        
        const headers = lines[1].split(',');
        const countryIndex = headers.indexOf('CountryLong');
        const ipIndex = headers.indexOf('IP');
        const hostIndex = headers.indexOf('HostName');

        const japanNodes = lines.slice(2)
            .filter(line => {
                const parts = line.split(',');
                return parts[countryIndex] === 'Japan';
            });

        if (japanNodes.length > 0) {
            const randomNode = japanNodes[Math.floor(Math.random() * japanNodes.length)];
            const parts = randomNode.split(',');
            const ip = parts[ipIndex];
            const host = parts[hostIndex];
            
            const result = { ip, host };
            
            if (filePath) {
                fs.writeFileSync(filePath, JSON.stringify(result));
            }
            
            if (isJson) {
                console.log(JSON.stringify(result));
            } else if (!filePath) {
                console.log('\n--- Random Japanese VPN Found ---');
                console.log(`IP Address: ${ip}`);
                console.log(`Hostname:   ${host}.opengw.net`);
                console.log('----------------------------------\n');
                console.log('Note: Use this IP/Hostname in your VPN client (OpenVPN/SoftEther).');
            }
            
            return result;
        } else {
            if (!isJson && !filePath) console.log('No Japanese nodes found in the current list.');
            return null;
        }
    } catch (error) {
        if (!isJson && !filePath) console.error('Failed to fetch VPN list:', error.message);
        return null;
    }
}

if (require.main === module) {
    getRandomJapanVpn().catch(err => {
        const isJson = process.argv.includes('--json');
        if (!isJson) console.error('Unhandled error:', err.message);
        process.exit(1);
    });
}

module.exports = getRandomJapanVpn;
