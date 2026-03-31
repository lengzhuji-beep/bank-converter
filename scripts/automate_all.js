const { execSync } = require('child_process');
const axios = require('axios');
const { chromium } = require('playwright');

const VPNCMD_PATH = 'C:\\Program Files\\SoftEther VPN Client\\vpncmd_x64.exe';
const ACCOUNT_NAME = 'VPNGateAuto';

// Helper to run vpncmd
function runVpnCmd(cmd) {
    try {
        const fullCmd = `"${VPNCMD_PATH}" localhost /CLIENT /CMD ${cmd}`;
        return execSync(fullCmd).toString();
    } catch (e) {
        return e.stdout ? e.stdout.toString() : e.message;
    }
}

// 1. VPN Connection Logic (with Retry)
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
            
            // Note: Standard VPN Gate config
            runVpnCmd(`AccountCreate ${ACCOUNT_NAME} /SERVER:${ip}:443 /HUB:VPNGATE /USERNAME:vpn /NICNAME:VPN`);
            runVpnCmd(`AccountPasswordSet ${ACCOUNT_NAME} /PASSWORD:vpn /TYPE:standard`);
            
            console.log('Connecting...');
            runVpnCmd(`AccountConnect ${ACCOUNT_NAME}`);

            // Wait for connection with longer timeout (60 seconds)
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

// 2. Automation Logic (Master Randomizer)
async function runAutomation() {
    console.log('\n--- [2/4] Browser Automation (Master Randomizer) ---');
    const browser = await chromium.launch({ headless: false, slowMo: 800 }); 
    const context = await browser.newContext();
    const page = await context.newPage();

    const startUrl = 'https://shikaku-taisaku.com/';

    const handleAds = async () => {
        try {
            const adCloseSelectors = ['#dismiss-button', '.card-close-button', '[aria-label="Close ad"]', '[aria-label="広告を閉じる"]', 'div[role="button"]:has-text("閉じる")'];
            for (const selector of adCloseSelectors) {
                const el = await page.$(selector);
                if (el && await el.isVisible()) {
                    console.log(`Closing ad: ${selector}`);
                    await el.click().catch(() => {});
                }
            }
        } catch (e) {}
    };

    const runQuizMode = async () => {
        console.log('\n>> Entering [Quiz Mode]');
        await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
        const modes = ['単語のテストモード', '単語のトレーニング'];
        const chosenMode = modes[Math.floor(Math.random() * modes.length)];
        await page.click(`text="${chosenMode}"`);
        await page.waitForTimeout(3000);
        await handleAds();

        const levels = await page.$$('button.icon-button');
        if (levels.length > 0) {
            await levels[Math.floor(Math.random() * Math.min(levels.length, 5))].click();
            await page.waitForTimeout(3000);
            await handleAds();
        }

        const countButtons = await page.$$('.count-button, button:has-text("問")');
        if (countButtons.length > 0) {
            await countButtons[0].click();
            await page.waitForTimeout(3000);
            await handleAds();
        }

        const numQs = Math.floor(Math.random() * 8) + 7; // 7-15 questions
        for (let i = 0; i < numQs; i++) {
            await handleAds();
            const choices = await page.$$('#choices-container button');
            if (choices.length > 0) {
                await choices[Math.floor(Math.random() * choices.length)].click();
                await page.waitForTimeout(Math.random() * 2000 + 1500);
                const nextBtn = await page.$('#next-btn');
                if (nextBtn && await nextBtn.isVisible()) {
                    await nextBtn.click();
                    await page.waitForTimeout(1500);
                }
            } else break;
        }
    };

    const runBrowsingMode = async () => {
        console.log('\n>> Entering [Browsing Mode]');
        const headerLinks = [
            'a[href*="toeic-overview.html"]',
            'a[href*="toeic-books.html"]',
            'a[href*="column.html"]',
            'a[href*="other-exams.html"]',
            'a[href*="profile.html"]'
        ];
        
        const numPages = Math.floor(Math.random() * 3) + 2; // Visit 2-4 pages
        for (let i = 0; i < numPages; i++) {
            await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
            await handleAds();
            const selector = headerLinks[Math.floor(Math.random() * headerLinks.length)];
            console.log(`Browsing to header: ${selector}`);
            await page.click(selector);
            await page.waitForTimeout(3000);
            await handleAds();

            // Random scrolling on the page
            const scrolls = Math.floor(Math.random() * 3) + 2;
            for (let s = 0; s < scrolls; s++) {
                const y = Math.floor(Math.random() * 2000);
                await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), y);
                await page.waitForTimeout(Math.random() * 3000 + 2000);
            }
        }
    };

    try {
        // Master Randomization: Decide path
        const pathType = Math.random();
        if (pathType < 0.4) {
            // Path A: Browse then Quiz
            await runBrowsingMode();
            await runQuizMode();
        } else if (pathType < 0.8) {
            // Path B: Quiz then Browse
            await runQuizMode();
            await runBrowsingMode();
        } else {
            // Path C: Deep Browse only
            await runBrowsingMode();
            await runBrowsingMode();
        }
        console.log('\nMaster randomization flow completed.');
    } finally {
        await page.waitForTimeout(5000);
        await browser.close();
    }
}

// 3. Disconnect Logic
function disconnectVpn() {
    console.log('\n--- [3/4] VPN Disconnection ---');
    console.log('Disconnecting and cleaning up...');
    runVpnCmd(`AccountDisconnect ${ACCOUNT_NAME}`);
    runVpnCmd(`AccountDelete ${ACCOUNT_NAME}`);
    console.log('VPN Disconnected.');
}

// Master Flow
async function main() {
    try {
        await connectVpnWithRetry(3); // Retry 3 different servers
        await runAutomation();
        disconnectVpn();
        console.log('\n--- [4/4] Process Finished Successfully ---');
    } catch (error) {
        console.error('\n[ERROR] Final failure:', error.message);
        disconnectVpn();
    }
}

main();
