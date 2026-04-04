const fs = require('fs');
const axios = require('axios');
const { chromium } = require('playwright');
const readline = require('readline');
const { execSync } = require('child_process');

const HISTORY_FILE = 'vpn_history.json';

const VPNCMD_PATH = 'C:\\Program Files\\SoftEther VPN Client\\vpncmd_x64.exe';
const VPN_CLIENT_PATH = 'C:\\Program Files\\SoftEther VPN Client\\vpn_client_x64.exe';
const ACCOUNT_NAME = 'VPNGateAuto';

// Helper for UI input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Helper to run vpncmd
function runVpnCmd(cmd) {
    try {
        const fullCmd = `"${VPNCMD_PATH}" localhost /CLIENT /CMD ${cmd}`;
        return execSync(fullCmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    } catch (e) {
        return e.stdout ? e.stdout.toString() : 'Error';
    }
}

// 0. IP Verification Logic
async function checkCurrentIp() {
    console.log('\n--- Checking Current IP Status ---');
    try {
        const res = await axios.get('http://ip-api.com/json/');
        const data = res.data;
        console.log(`[IP Address] ${data.query}`);
        console.log(`[Location]   ${data.country} (${data.city})`);
        console.log(`[ISP]        ${data.isp}`);
        
        if (data.countryCode !== 'JP') {
            console.warn('WARNING: Current IP is NOT in Japan!');
        } else {
            console.log('SUCCESS: Verified Japan IP.');
        }
        return data;
    } catch (e) {
        console.error('Failed to verify IP:', e.message);
        return null;
    }
}

// 1. VPN Connection Logic (Automatic)
async function connectVpnWithRetry(initialIp, maxRetries = 10) {
    console.log('\n--- [1/4] VPN Connection ---');
    
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
        try { history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch (e) {}
    }

    console.log('Fetching Japan VPN list and selecting high-score elite nodes...');
    let candidates = [];
    try {
        const response = await axios.get('https://www.vpngate.net/api/iphone/');
        const allLines = response.data.split('\n');
        const headers = allLines[1].split(',');
        const hostIdx = headers.indexOf('#HostName');
        const ipIdx = headers.indexOf('IP');
        const scoreIdx = headers.indexOf('Score');
        const countryIdx = headers.indexOf('CountryLong');
        const countryShortIdx = headers.indexOf('CountryShort');

        candidates = allLines.slice(2).map(line => {
            const parts = line.split(',');
            if (parts.length < 10) return null;
            
            const ip = parts[ipIdx];
            const host = parts[hostIdx] ? `${parts[hostIdx]}.opengw.net` : ip;
            const isJapan = parts[countryIdx] === 'Japan' || parts[countryShortIdx] === 'JP';
            const isUsed = history.includes(ip);
            
            if (!isJapan || isUsed) return null;
            return { ip, host, score: parseInt(parts[scoreIdx]) || 0 };
        }).filter(n => n !== null).sort((a, b) => b.score - a.score);

        if (candidates.length === 0) {
            console.warn('  No fresh Japan nodes found. Clearing history...');
            fs.writeFileSync(HISTORY_FILE, '[]');
            return connectVpnWithRetry(initialIp, maxRetries);
        }
    } catch (e) {
        throw new Error(`Failed to fetch VPN list: ${e.message}`);
    }

    // Pick nodes, but prefer IP-based connection as it was successful before
    const ACCOUNT_NAME = 'VPNGateAuto';
    const VPN_CLIENT_PATH = 'C:\\Program Files\\SoftEther VPN Client\\vpncmgr_x64.exe';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const elitePool = candidates.slice(0, 10);
        const node = elitePool[Math.floor(Math.random() * elitePool.length)];
        
        console.log(`\n[Attempt ${attempt}/${maxRetries}] Target IP: ${node.ip} (Score: ${node.score})`);

        try {
            console.log('  Preparing GUI profile (Reset & Create fresh)...');
            runVpnCmd(`NicEnable VPN`);
            runVpnCmd(`AccountDisconnect "${ACCOUNT_NAME}"`);
            runVpnCmd(`AccountDelete "${ACCOUNT_NAME}"`);

            console.log(`  Configuring new Profile to bypass plugin restrictions...`);
            let createOutput = runVpnCmd(`AccountCreate "${ACCOUNT_NAME}" /SERVER:${node.ip}:443 /HUB:VPNGATE /USERNAME:vpn /NICNAME:VPN`);
            runVpnCmd(`AccountPasswordSet "${ACCOUNT_NAME}" /PASSWORD:vpn /TYPE:standard`);

            console.log('  Launching SoftEther GUI to establish connection (App window should appear)...');
            // Allow a small delay to let SoftEther write the config to disk
            await new Promise(r => setTimeout(r, 1000));
            
            // Open GUI so Windows sees the desktop app as active
            execSync(`start "" "${VPN_CLIENT_PATH}"`, { stdio: 'ignore' });
            
            // Actually trigger the connection
            console.log('  Triggering connection command...');
            runVpnCmd(`AccountConnect "${ACCOUNT_NAME}"`);

            console.log('  Waiting for GUI handshake & IP assignment (max 40s)...');
            let connected = false;
            
            // Give GUI time to pop up and negotiate
            await new Promise(r => setTimeout(r, 12000));
            
            for (let j = 0; j < 8; j++) {
                const currentIpData = await getIpData();
                if (currentIpData && currentIpData.query !== initialIp) {
                    console.log(`\n  SUCCESS: IP changed to ${currentIpData.query} (${currentIpData.country})`);
                    history.push(node.ip);
                    if (history.length > 20) history.shift();
                    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history));
                    connected = true;
                    
                    // Close the GUI window to keep screen clean (connection stays active)
                    try { execSync('taskkill /IM vpncmgr_x64.exe /F', { stdio: 'ignore' }); } catch(e) {}
                    
                    return true;
                }
                process.stdout.write('?'); 
                await new Promise(r => setTimeout(r, 4000));
            }
            
            if (!connected) {
                console.log('\n  Timeout: IP did not change. Removing this node from current candidates...');
                candidates = candidates.filter(c => c.ip !== node.ip);
                runVpnCmd(`AccountDisconnect "${ACCOUNT_NAME}"`);
                try { execSync('taskkill /IM vpncmgr_x64.exe /F', { stdio: 'ignore' }); } catch(e) {}
            }

        } catch (error) {
            console.error(`\n  Attempt ${attempt} error:`, error.message);
        }
    }
    throw new Error('Could not establish a stable VPN connection after multiple attempts.');
}

// Helper: Get IP silently
async function getIpData() {
    try {
        const res = await axios.get('http://ip-api.com/json/', { timeout: 5000 });
        return res.data;
    } catch (e) {
        return null;
    }
}

// Helper: Smart Click that handles obstructions
async function smartClick(page, selector, options = {}) {
    await page.waitForLoadState('load'); // Ensure basic load first
    console.log(`  Smart-clicking: ${selector}`);
    const timeout = options.timeout || 15000;
    const start = Date.now();
    
    const locator = page.locator(selector).first();
    try {
        await locator.scrollIntoViewIfNeeded({ timeout: 5000 });
    } catch (e) {}

    while (Date.now() - start < timeout) {
        try {
            await locator.waitFor({ state: 'visible', timeout: 3000 });
            await locator.click({ timeout: 3000 });
            return true;
        } catch (e) {
            console.log(`    [Retry] Element blocked/hidden. Clearing ads...`);
            await handleAds(page);
            await page.waitForTimeout(2000);
        }
    }
    
    console.warn(`    [Warning] Normal click failed. Force-clicking...`);
    return locator.click({ force: true, timeout: 5000 }).catch(e => {
        throw new Error(`SmartClick failed for ${selector}: ${e.message}`);
    });
}

const handleAds = async (page) => {
    try {
        const adCloseSelectors = [
            '#dismiss-button', '.card-close-button', '[aria-label="Close ad"]', 
            '[aria-label="広告を閉じる"]', 'div[role="button"]:has-text("閉じる")',
            '#card .close-button', '.p_close_button', '.vignette-dismiss-button'
        ];
        for (const selector of adCloseSelectors) {
            const el = await page.$(selector);
            if (el && await el.isVisible()) {
                console.log(`  Closing overlay: ${selector}`);
                await el.click().catch(() => {});
            }
        }
        for (const frame of page.frames()) {
            try {
                const dismissBtn = frame.locator('#dismiss-button, [aria-label="Close ad"]');
                if (await dismissBtn.isVisible()) {
                    console.log('  Closing AdSense Vignette via iframe...');
                    await dismissBtn.click();
                    return;
                }
            } catch (e) {}
        }
    } catch (e) {}
};

// Target ad clicks (3-5 per session)
let globalAdsClicked = 0;
let globalAdTarget = 3;

async function clickRandomAd(page) {
    if (globalAdsClicked >= globalAdTarget) return false;
    
    // Increase probability if we haven't hit the target yet
    const prob = globalAdsClicked === 0 ? 0.7 : 0.4;
    if (Math.random() > prob) return false;

    console.log(`\n>> [Ad Mode] Interaction ${globalAdsClicked + 1}/${globalAdTarget}`);
    try {
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        const adLocators = ['ins.adsbygoogle', 'iframe[id^="google_ads_iframe"]', '.ad-container'];
        
        let foundAd = null;
        for (const sel of adLocators) {
            const ads = await page.$$(sel);
            for (const ad of ads) {
                if (await ad.isVisible()) {
                    foundAd = ad;
                    break;
                }
            }
            if (foundAd) break;
        }

        if (foundAd) {
            console.log('  Found visible ad. Executing click...');
            
            // Count as success if the click action completes
            globalAdsClicked++;
            
            const [newPage] = await Promise.all([
                page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null),
                foundAd.click({ force: true, delay: 100 }).catch(e => {
                    console.log(`  Click failed: ${e.message}`);
                    globalAdsClicked--; // Revert if click literally failed
                    return null;
                })
            ]);

            if (newPage) {
                console.log(`  Ad SUCCESS (New Tab). Waiting 6s...`);
                await newPage.waitForTimeout(6000);
                await newPage.close().catch(() => {});
            } else {
                console.log(`  Ad Interaction Recorded (No new tab detected).`);
                await page.waitForTimeout(3000);
            }
            return true;
        }
    } catch (e) {
        console.log(`  Ad interaction skipped: ${e.message}`);
    }
    return false;
}

// 2. Automation Logic (Master Randomizer)
async function runAutomation() {
    globalAdTarget = Math.floor(Math.random() * 3) + 3; // 3 to 5
    console.log(`\n--- [2/4] Browser Automation (Target: ${globalAdTarget} Ads) ---`);
    
    const browser = await chromium.launch({ headless: false, slowMo: 800 }); 
    const context = await browser.newContext();
    const page = await context.newPage();
    const startUrl = 'https://shikaku-taisaku.com/';

    const runQuizMode = async () => {
        console.log('\n>> Entering [Quiz/Training Mode]');
        await page.goto(startUrl, { waitUntil: 'load' });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        await handleAds(page);

        const modes = [
            { name: 'トレーニング', selector: 'a.mode-button.button-link[href*="training.html"]' },
            { name: 'テスト', selector: 'a.mode-button.button-link[href*="test.html"]' }
        ];
        const chosen = modes[Math.floor(Math.random() * modes.length)];
        await smartClick(page, chosen.selector);
        await page.waitForLoadState('load');
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        await handleAds(page);

        console.log('Selecting Level...');
        await smartClick(page, '#level-select .icon-button, .icon-button');
        await page.waitForTimeout(3000);
        await handleAds(page);

        const countBtnSelector = '.icon-container .icon-button, button:has-text("問")';
        if (await page.$(countBtnSelector)) {
            await smartClick(page, countBtnSelector);
            await page.waitForTimeout(3000);
        }

        const numQs = Math.floor(Math.random() * 10) + 10;
        for (let i = 0; i < numQs; i++) {
            await handleAds(page);
            if (globalAdsClicked < globalAdTarget) await clickRandomAd(page);
            try {
                await smartClick(page, '#choices button');
                await page.waitForTimeout(Math.random() * 2000 + 2000);
                if (await page.$('#next-btn')) await smartClick(page, '#next-btn');
            } catch (e) { break; }
        }
    };

    const runBrowsingMode = async () => {
        console.log('\n>> Entering [Autonomous Browsing Mode]');
        const links = ['column.html', 'toeic-books.html', 'toeic-overview.html', 'profile.html', 'toeic-vocabulary.html'];
        
        for (const link of links.sort(() => Math.random() - 0.5).slice(0, 4)) {
            await page.goto(startUrl, { waitUntil: 'load' });
            await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
            await clickRandomAd(page);
            try {
                const sel = `a[href*="${link}"]`;
                await smartClick(page, sel);
                await page.waitForLoadState('load');
                await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
                
                const scrolls = Math.floor(Math.random() * 6) + 4;
                for (let s = 0; s < scrolls; s++) {
                    await page.evaluate(() => window.scrollBy({ top: Math.random() * 800 + 200, behavior: 'smooth' }));
                    await page.waitForTimeout(Math.random() * 4000 + 3000);
                    if (globalAdsClicked < globalAdTarget) await clickRandomAd(page);
                }
            } catch (e) {}
        }
    };

    try {
        await runBrowsingMode();
        await runQuizMode();
        if (globalAdsClicked < globalAdTarget) {
            console.log('\n>> Targeted ad quota not met. Extra browsing...');
            await runBrowsingMode();
        }
    } catch (e) {
        console.error(`[CRITICAL] Error: ${e.message}`);
        await page.screenshot({ path: 'failure_screenshot.png' });
        throw e;
    } finally {
        await browser.close();
    }
}

// 3. Disconnect Logic
async function disconnectVpn() {
    console.log('\n--- [3/4] VPN Disconnection ---');
    console.log('Attempting to disconnect and cleanup SoftEther...');
    
    // Attempt stop if connected
    const status = runVpnCmd(`AccountStatusGet "${ACCOUNT_NAME}"`);
    if (!status.includes('エラー')) {
        console.log(`  Disconnecting ${ACCOUNT_NAME}...`);
        runVpnCmd(`AccountDisconnect "${ACCOUNT_NAME}"`);
    }
    
    // Hard-reset the Virtual NIC to clear OS-level IP/Routes
    console.log('  Hard-resetting Virtual NIC (VPN)...');
    runVpnCmd(`NicDisable VPN`); // Disable
    await new Promise(r => setTimeout(r, 2000));
    runVpnCmd(`NicEnable VPN`);  // Re-enable for next time
    
    // Cleanup profile
    runVpnCmd(`AccountDelete "${ACCOUNT_NAME}"`);
    
    console.log('VPN Cleanup Process Finished. System is now back to original IP.');
}

// Master Flow
async function main() {
    console.log('=======================================');
    console.log('   Silent-IP & Ad-Quota Automation    ');
    console.log('=======================================');

    const initialIpData = await getIpData();
    const initialIp = initialIpData ? initialIpData.query : null;
    console.log(`Initial IP: ${initialIp || 'Unknown'}`);

    try {
        console.log('\n>> Entering [Full Automatic Mode]');
        await connectVpnWithRetry(initialIp, 10);

        await runAutomation();
        await disconnectVpn(true);
        console.log('\n--- [4/4] Completed successfully ---');
    } catch (error) {
        console.error('\n[ERROR] Aborted:', error.message);
        await disconnectVpn(true);
    } finally {
        rl.close();
    }
}

main();
