const axios = require('axios');

/**
 * Fetches a list of free proxies and returns the first one.
 */
async function getFreeProxy() {
    console.log('Fetching free proxies...');
    const url = 'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all';
    
    try {
        const response = await axios.get(url);
        const proxies = response.data.trim().split('\n');
        if (proxies.length > 0) {
            const proxy = proxies[0].trim();
            console.log(`Suggested Proxy: http://${proxy}`);
            return `http://${proxy}`;
        } else {
            throw new Error('No proxies found');
        }
    } catch (error) {
        console.error('Failed to fetch proxies:', error.message);
        return null;
    }
}

if (require.main === module) {
    getFreeProxy();
}

module.exports = getFreeProxy;
