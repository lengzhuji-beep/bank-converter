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
async function connectVpnWithRetry(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`\n--- [1/4] VPN Connection (Attempt ${attempt}/${maxRetries}) ---`);
        
        try {
            console.log('Fetching Japan VPN list...');
            const url = 'https://www.vpngate.net/api/iphone/';
            const response = await axios.get(url);
            const lines = response.data.split('\n');
            const headers = lines[1].split(',');
            const countryIndex = headers.indexOf('CountryLong');
            const ipIndex = headers.indexOf('IP');

            const japanNodes = lines.slice(2).filter(line => line.split(',')[countryIndex] === 'Japan');
            if (japanNodes.length === 0) throw new Error('No Japanese nodes found.');

            const randomNode = japanNodes[Math.floor(Math.random() * japanNodes.length)];
            const ip = randomNode.split(',')[ipIndex];
            console.log(`Selected IP: ${ip} (Japan)`);

            console.log('Configuring SoftEther...');
            runVpnCmd(`AccountDisconnect ${ACCOUNT_NAME}`);
            runVpnCmd(`AccountDelete ${ACCOUNT_NAME}`);
            
            runVpnCmd(`AccountCreate ${ACCOUNT_NAME} /SERVER:${ip}:443 /HUB:VPNGATE /USERNAME:vpn /NICNAME:VPN`);
            runVpnCmd(`AccountPasswordSet ${ACCOUNT_NAME} /PASSWORD:vpn /TYPE:standard`);
            
            console.log('Connecting...');
            runVpnCmd(`AccountConnect ${ACCOUNT_NAME}`);

            console.log('Waiting for "Connected" status (max 60s)...');
            let connected = false;
            for (let i = 0; i < 30; i++) {
                const status = runVpnCmd(`AccountStatusGet ${ACCOUNT_NAME}`);
                if (status.includes('接続完了') || status.includes('Connected')) {
                    console.log('\nVPN Connected successfully!');
                    connected = true;
                    break;
                }
                process.stdout.write('.');
                await new Promise(r => setTimeout(r, 2000));
            }

            if (connected) return true;
            console.log('\nTimeout on this server. Retrying with another...');

        } catch (error) {
            console.error('\nAttempt failed:', error.message);
        }
    }
    throw new Error('All VPN connection attempts failed.');
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

    console.log(`\n>> [Ad Mode] Attempt ${globalAdsClicked + 1}/${globalAdTarget}`);
    try {
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        const adLocators = ['ins.adsbygoogle', 'iframe[id^="google_ads_iframe"]', '.ad-container'];
        
        let foundAd = null;
        for (const sel of adLocators) {
            const ads = await page.$$(sel);
            if (ads.length > 0) {
                const visibleAds = [];
                for (const ad of ads) if (await ad.isVisible()) visibleAds.push(ad);
                if (visibleAds.length > 0) {
                    foundAd = visibleAds[Math.floor(Math.random() * visibleAds.length)];
                    break;
                }
            }
        }

        if (foundAd) {
            console.log('  Found visible ad. Clicking...');
            const [newPage] = await Promise.all([
                page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null),
                foundAd.click({ force: true })
            ]);

            if (newPage) {
                globalAdsClicked++;
                console.log(`  Ad SUCCESS (${globalAdsClicked}/${globalAdTarget}). Waiting 6s...`);
                await newPage.waitForTimeout(6000);
                await newPage.close();
                return true;
            }
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
        await page.goto(startUrl, { waitUntil: 'networkidle' });
        await handleAds(page);

        const modes = [
            { name: 'トレーニング', selector: 'a.mode-button.button-link[href*="training.html"]' },
            { name: 'テスト', selector: 'a.mode-button.button-link[href*="test.html"]' }
        ];
        const chosen = modes[Math.floor(Math.random() * modes.length)];
        await smartClick(page, chosen.selector);
        await page.waitForLoadState('networkidle').catch(() => {});
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
            await page.goto(startUrl, { waitUntil: 'networkidle' });
            await clickRandomAd(page);
            try {
                const sel = `a[href*="${link}"]`;
                await smartClick(page, sel);
                await page.waitForLoadState('networkidle').catch(() => {});
                
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
function disconnectVpn() {
    console.log('\n--- [3/4] VPN Disconnection ---');
    runVpnCmd(`AccountDisconnect ${ACCOUNT_NAME}`);
    runVpnCmd(`AccountDelete ${ACCOUNT_NAME}`);
    console.log('VPN Disconnected.');
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

    try {
        if (choice === '1') {
            await connectVpnWithRetry(3);
        } else {
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
        disconnectVpn();
        console.log('\n--- [4/4] Completed successfully ---');
    } catch (error) {
        console.error('\n[ERROR] Aborted:', error.message);
        disconnectVpn();
    } finally {
        rl.close();
    }
}

main();
