const { execSync } = require('child_process');
const axios = require('axios');
const { chromium } = require('playwright');
const readline = require('readline');

const VPNCMD_PATH = 'C:\\Program Files\\SoftEther VPN Client\\vpncmd_x64.exe';
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
        return execSync(fullCmd).toString();
    } catch (e) {
        return e.stdout ? e.stdout.toString() : e.message;
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
async function connectVpnWithRetry(maxRetries = 10) {
    console.log('\n--- [1/4] VPN Connection ---');
    console.log('Fetching Japan VPN list and prioritizing high-quality nodes...');
    
    let sortedNodes = [];
    try {
        const response = await axios.get('https://www.vpngate.net/api/iphone/');
        const allLines = response.data.split('\n');
        
        // Find indices from header
        const headers = allLines[1].split(',');
        const ipIdx = headers.indexOf('IP');
        const scoreIdx = headers.indexOf('Score');
        const countryIdx = headers.indexOf('CountryLong');
        const countryShortIdx = headers.indexOf('CountryShort');

        // Strict filtering for 'Japan' or 'JP'
        sortedNodes = allLines.slice(2).map(line => {
            const parts = line.split(',');
            if (parts.length < 10) return null;
            
            const isJapan = parts[countryIdx] === 'Japan' || parts[countryShortIdx] === 'JP';
            if (!isJapan) return null;

            return { ip: parts[ipIdx], score: parseInt(parts[scoreIdx]) || 0 };
        }).filter(n => n !== null).sort((a, b) => b.score - a.score);

        if (sortedNodes.length === 0) throw new Error('No Japan nodes found.');
        console.log(`  Found ${sortedNodes.length} Japanese nodes. Attempting best quality...`);
    } catch (e) {
        throw new Error(`Failed to fetch VPN list: ${e.message}`);
    }

    for (let attempt = 0; attempt < Math.min(maxRetries, sortedNodes.length); attempt++) {
        const { ip, score } = sortedNodes[attempt];
        console.log(`\n[Attempt ${attempt + 1}/${maxRetries}] Target IP: ${ip} (Score: ${score})`);

        try {
            console.log('  Cleaning up previous state...');
            runVpnCmd(`AccountDisconnect ${ACCOUNT_NAME}`);
            runVpnCmd(`AccountDelete ${ACCOUNT_NAME}`);

            console.log(`  Configuring SoftEther for ${ip}...`);
            runVpnCmd(`AccountCreate ${ACCOUNT_NAME} /SERVER:${ip}:443 /HUB:VPNGATE /USERNAME:vpn /NICNAME:VPN`);
            runVpnCmd(`AccountPasswordSet ${ACCOUNT_NAME} /PASSWORD:vpn /TYPE:standard`);
            runVpnCmd(`AccountConnect ${ACCOUNT_NAME}`);

            console.log('  Waiting for connection (max 30s)...');
            let connected = false;
            for (let i = 0; i < 15; i++) {
                const status = runVpnCmd(`AccountStatusGet ${ACCOUNT_NAME}`);
                if (status.includes('接続完了') || status.includes('Connected')) {
                    console.log('\n  VPN Connected successfully!');
                    connected = true;
                    break;
                }
                process.stdout.write('.');
                await new Promise(r => setTimeout(r, 2000));
            }

            if (connected) {
                console.log('  Wait 10s for Windows to update routing and DHCP...');
                await new Promise(r => setTimeout(r, 10000));
                
                // Force Metric priority via PowerShell
                try {
                    console.log('  Optimizing network priority (Metric: 1)...');
                    const psCmd = 'powershell -Command "Get-NetIPInterface -InterfaceAlias \'*VPN*\' | Set-NetIPInterface -InterfaceMetric 1"';
                    execSync(psCmd);
                } catch (e) {
                    console.log('  Note: Manual routing optimization skipped.');
                }
                
                return true;
            }
            console.log('\n  Timeout on this server. Trying next high-quality node...');

        } catch (error) {
            console.error(`\n  Attempt ${attempt + 1} error:`, error.message);
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
async function disconnectVpn(isAutomatic) {
    if (!isAutomatic) {
        console.log('\n--- [3/4] Status ---');
        console.log('Manual VPN mode: Please disconnect your VPN manually if needed.');
        return;
    }

    console.log('\n--- [3/4] VPN Disconnection ---');
    console.log('Attempting to disconnect and cleanup SoftEther...');
    
    // Attempt stop if connected
    const status = runVpnCmd(`AccountStatusGet ${ACCOUNT_NAME}`);
    if (!status.includes('エラー')) {
        console.log('  Active connection found. Disconnecting...');
        runVpnCmd(`AccountDisconnect ${ACCOUNT_NAME}`);
    }
    
    // Hard-reset the Virtual NIC to clear OS-level IP/Routes
    console.log('  Hard-resetting Virtual NIC (VPN)...');
    runVpnCmd(`NicDisable VPN`); // Disable
    await new Promise(r => setTimeout(r, 2000));
    runVpnCmd(`NicEnable VPN`);  // Re-enable for next time
    
    // Cleanup profile
    runVpnCmd(`AccountDelete ${ACCOUNT_NAME}`);
    
    console.log('VPN Cleanup Process Finished. System is now back to original IP.');
}

// Master Flow
async function main() {
    console.log('=======================================');
    console.log('   Silent-IP & Ad-Quota Automation    ');
    console.log('=======================================');

    const initialIpData = await getIpData();
    console.log(`Initial IP: ${initialIpData ? initialIpData.query : 'Unknown'}`);

    console.log('\n[1] Automatic VPN  [2] Manual Mode');
    const choice = await askQuestion('Choice (1/2): ');
    const isAutomatic = (choice === '1');

    try {
        if (isAutomatic) {
            await connectVpnWithRetry(3);
        } else {
            console.log('\n>> Manual Mode Selected.');
            console.log('Waiting for manual VPN connection...');
            await askQuestion('Press ENTER when connected...');
        }

        const newIpData = await getIpData();
        if (newIpData) {
            console.log(`\nCurrent IP: ${newIpData.query} (${newIpData.country})`);
            if (initialIpData && newIpData.query === initialIpData.query) {
                console.warn('WARNING: IP has NOT changed. Possible VPN failure.');
                const proceed = await askQuestion('Proceed anyway? (y/N): ');
                if (proceed.toLowerCase() !== 'y') throw new Error('IP verification failed.');
            } else {
                console.log('SUCCESS: IP changed. Proceeding automatically...');
            }
        }

        await runAutomation();
        await disconnectVpn(isAutomatic);
        console.log('\n--- [4/4] Completed successfully ---');
    } catch (error) {
        console.error('\n[ERROR] Aborted:', error.message);
        await disconnectVpn(isAutomatic);
    } finally {
        rl.close();
    }
}

main();
