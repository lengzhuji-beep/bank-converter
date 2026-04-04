// ... (previous helper functions: runVpnCmd, checkCurrentIp, etc.)

// Helper: Smart Click that handles obstructions
async function smartClick(page, selector, options = {}) {
    console.log(`  Smart-clicking: ${selector}`);
    const timeout = options.timeout || 10000;
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
        try {
            const el = page.locator(selector).first();
            await el.waitFor({ state: 'visible', timeout: 2000 });
            await el.click({ timeout: 2000 });
            return true;
        } catch (e) {
            console.log(`    [Retry] Element blocked or not visible. Checking for ads/overlays...`);
            // Try to find and close ads that might be covering it
            await handleAds(page);
            await page.waitForTimeout(1000);
        }
    }
    
    console.warn(`    [Warning] Normal click failed. Attempting force-click as last resort...`);
    return page.click(selector, { force: true, timeout: 5000 }).catch(e => {
        throw new Error(`SmartClick failed for ${selector}: ${e.message}`);
    });
}

const handleAds = async (page) => {
    try {
        // 1. Common close buttons
        const adCloseSelectors = [
            '#dismiss-button', 
            '.card-close-button', 
            '[aria-label="Close ad"]', 
            '[aria-label="広告を閉じる"]', 
            'div[role="button"]:has-text("閉じる")',
            '#card .close-button'
        ];
        for (const selector of adCloseSelectors) {
            const el = await page.$(selector);
            if (el && await el.isVisible()) {
                console.log(`  Closing overlay: ${selector}`);
                await el.click().catch(() => {});
            }
        }

        // 2. Google AdSense Vignettes (search in all frames)
        for (const frame of page.frames()) {
            try {
                const dismissBtn = frame.locator('#dismiss-button');
                if (await dismissBtn.isVisible()) {
                    console.log('  Closing AdSense Vignette via iframe...');
                    await dismissBtn.click();
                    return;
                }
            } catch (e) {}
        }
    } catch (e) {}
};

// New: Function to randomly click an AdSense ad
async function clickRandomAd(page) {
    if (Math.random() > 0.3) return; // 30% chance to click

    console.log('\n>> [Ad Mode] Attempting a random ad interaction...');
    try {
        const adLocators = [
            'ins.adsbygoogle',
            'iframe[id^="google_ads_iframe"]',
            '.ad-container'
        ];
        
        let foundAd = null;
        for (const sel of adLocators) {
            const ads = await page.$$(sel);
            if (ads.length > 0) {
                foundAd = ads[Math.floor(Math.random() * ads.length)];
                break;
            }
        }

        if (foundAd) {
            console.log('  Ad found. Clicking...');
            const [newPage] = await Promise.all([
                page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null),
                foundAd.click({ force: true })
            ]);

            if (newPage) {
                console.log('  Ad opened in new tab. Waiting 5s then closing...');
                await newPage.waitForTimeout(5000);
                await newPage.close();
            }
        } else {
            console.log('  No visible ads found to interact with.');
        }
    } catch (e) {
        console.log(`  Ad interaction skipped: ${e.message}`);
    }
}

// 2. Automation Logic (Master Randomizer)
async function runAutomation() {
    console.log('\n--- [2/4] Browser Automation (Master Randomizer) ---');
    const browser = await chromium.launch({ headless: false, slowMo: 800 }); 
    const context = await browser.newContext();
    const page = await context.newPage();

    const startUrl = 'https://shikaku-taisaku.com/';

    const runQuizMode = async () => {
        console.log('\n>> Entering [Quiz/Training Mode]');
        await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
        await handleAds(page);

        const modes = [
            { name: 'トレーニング', selector: 'a.mode-button.button-link[href*="training.html"]' },
            { name: 'テスト', selector: 'a.mode-button.button-link[href*="test.html"]' }
        ];
        const chosen = modes[Math.floor(Math.random() * modes.length)];
        console.log(`Selecting Mode: ${chosen.name}`);
        
        await smartClick(page, chosen.selector);
        await page.waitForTimeout(3000);
        await handleAds(page);

        console.log('Selecting Level...');
        const levelSelector = '#level-select .icon-button, .icon-button';
        await smartClick(page, levelSelector);
        await page.waitForTimeout(3000);
        await handleAds(page);

        const countBtnSelector = '.icon-container .icon-button, button:has-text("問")';
        const countButtons = await page.$$(countBtnSelector);
        if (countButtons.length > 0) {
            await smartClick(page, countBtnSelector);
            await page.waitForTimeout(3000);
            await handleAds(page);
        }

        const numQs = Math.floor(Math.random() * 8) + 7;
        for (let i = 0; i < numQs; i++) {
            await handleAds(page);
            await clickRandomAd(page); // Occasional ad interaction between questions
            const choiceSelector = '#choices button';
            try {
                await smartClick(page, choiceSelector);
                await page.waitForTimeout(Math.random() * 2000 + 2000);
                
                const nextBtn = await page.$('#next-btn');
                if (nextBtn && await nextBtn.isVisible()) {
                    await smartClick(page, '#next-btn');
                    await page.waitForTimeout(2000);
                }
            } catch (e) {
                console.log(`Ending session early: ${e.message}`);
                break;
            }
        }
    };

    const runBrowsingMode = async () => {
        console.log('\n>> Entering [Deep Browsing Mode]');
        const headerLinks = [
            'a[href*="toeic-overview.html"]',
            'a[href*="toeic-books.html"]',
            'a[href*="column.html"]',
            'a[href*="other-exams.html"]',
            'a[href*="profile.html"]',
            'a[href*="toeic-vocabulary.html"]',
            'a[href*="toeic-types.html"]'
        ];
        
        const numPages = Math.floor(Math.random() * 4) + 2;
        for (let i = 0; i < numPages; i++) {
            await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
            await handleAds(page);
            await clickRandomAd(page);

            const selector = headerLinks[Math.floor(Math.random() * headerLinks.length)];
            try {
                await smartClick(page, selector);
                await page.waitForTimeout(4000);
                await handleAds(page);

                const scrolls = Math.floor(Math.random() * 5) + 3;
                for (let s = 0; s < scrolls; s++) {
                    const y = Math.floor(Math.random() * 3000);
                    const duration = Math.random() * 4000 + 3000;
                    console.log(`  Scrolling to Y=${y}...`);
                    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), y);
                    await page.waitForTimeout(duration);
                    if (Math.random() > 0.8) await clickRandomAd(page);
                }
            } catch (e) {
                console.log(`Navigation skipped: ${e.message}`);
            }
        }
    };

    try {
        const pathType = Math.random();
        console.log(`Master Path: ${pathType < 0.4 ? 'A' : pathType < 0.8 ? 'B' : 'C'}`);
        
        if (pathType < 0.4) {
            await runBrowsingMode();
            await runQuizMode();
        } else if (pathType < 0.8) {
            await runQuizMode();
            await runBrowsingMode();
        } else {
            await runBrowsingMode();
            await runBrowsingMode();
        }
    } catch (e) {
        console.error(`\x1b[31m[CRITICAL] Automation failed: ${e.message}\x1b[0m`);
        await page.screenshot({ path: 'failure_screenshot.png', fullPage: true });
        console.log('Failure screenshot saved to failure_screenshot.png');
        throw e;
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
    console.log('=======================================');
    console.log('   Advanced Automation Master Script   ');
    console.log('=======================================');
    console.log('\nVPN Selection Mode:');
    console.log('[1] Automatic (VPN Gate via SoftEther)');
    console.log('[2] Manual (Connect your own VPN first)');

    const choice = await askQuestion('\nChoose mode (1 or 2): ');

    try {
        if (choice === '1') {
            await connectVpnWithRetry(3);
        } else {
            console.log('\n>> Manual Mode Selected.');
            await askQuestion('Please connect to your VPN, then press ENTER...');
        }

        const ipData = await checkCurrentIp();
        if (ipData) {
            const confirm = await askQuestion('\nContinue with this connection? (Y/n): ');
            if (confirm.toLowerCase() === 'n') throw new Error('User aborted.');
        }

        await runAutomation();
        disconnectVpn();
        console.log('\n--- [4/4] Process Finished Successfully ---');
    } catch (error) {
        console.error('\n[ERROR] Process aborted:', error.message);
        disconnectVpn();
    } finally {
        rl.close();
    }
}

main();
