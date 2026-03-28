const { chromium } = require('playwright');

/**
 * Batch Automation Script
 * This script allows you to automate a series of actions on any website.
 */
async function runBatchAutomation() {
    // --- CONFIGURATION ---
    const config = {
        targetUrl: 'http://localhost:8080', // Change this to your target site
        headless: false, // Set to true to run in background
        slowMo: 1000, // Delay between actions (ms)
        proxy: null, // Example: { server: 'http://myproxy.com:3128', username: 'user', password: 'pwd' }
    };

    const actions = [
        { type: 'goto', url: config.targetUrl },
        { type: 'fill', selector: '#companyInput', value: '株式会社サンプル' },
        { type: 'click', selector: '#copyBtn' },
        { type: 'scroll', direction: 'bottom' },
        { type: 'wait', duration: 2000 },
        { type: 'scroll', direction: 'top' },
        // Add more actions here, like clicking on ads or menu items
        // Example: { type: 'click', selector: '.candidate-item:first-child' },
    ];
    // ---------------------

    console.log('Starting automation' + (config.proxy ? ` via proxy: ${config.proxy.server}` : '') + '...');
    const browser = await chromium.launch({ 
        headless: config.headless, 
        slowMo: config.slowMo,
        proxy: config.proxy || undefined 
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        for (const action of actions) {
            console.log(`Executing: ${action.type} ${action.selector || action.url || ''}`);
            
            switch (action.type) {
                case 'goto':
                    await page.goto(action.url);
                    break;
                case 'fill':
                    await page.fill(action.selector, action.value);
                    break;
                case 'click':
                    await page.click(action.selector);
                    break;
                case 'scroll':
                    if (action.direction === 'bottom') {
                        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                    } else if (action.direction === 'top') {
                        await page.evaluate(() => window.scrollTo(0, 0));
                    }
                    break;
                case 'wait':
                    await page.waitForTimeout(action.duration);
                    break;
                default:
                    console.warn(`Unknown action type: ${action.type}`);
            }
        }
        console.log('Batch automation completed successfully!');
    } catch (error) {
        console.error('Automation failed:', error);
    } finally {
        // Keep the browser open for a few seconds so you can see the results
        await page.waitForTimeout(3000);
        await browser.close();
    }
}

runBatchAutomation();
