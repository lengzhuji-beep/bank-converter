const { test, expect } = require('@playwright/test');

test.describe('Bank Converter Interaction Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Assume the server is running at http://localhost:8080
        await page.goto('http://localhost:8080');
    });

    test('should convert company name and copy to clipboard', async ({ page }) => {
        const input = page.locator('#companyInput');
        const result = page.locator('#convertedResult');
        const copyBtn = page.locator('#copyBtn');

        // Typing a name
        await input.fill('株式会社ウェブフリコム');
        
        // Wait for conversion (it's immediate in JS, but good to check)
        await expect(result).toContainText('（カ）ウエブフリコム');

        // Click copy - Note: clipboard access in headless browser might need permissions
        await copyBtn.click();
        
        // Visual check of the result area
        await expect(result).toBeVisible();
    });

    test('should show candidates and allow clicking them', async ({ page }) => {
        const input = page.locator('#companyInput');
        await input.fill('テスト');

        const firstCandidate = page.locator('#candidatesList .candidate-item').first();
        await expect(firstCandidate).toBeVisible();

        const candidateText = await firstCandidate.textContent();
        await firstCandidate.click();

        // The result should now match the clicked candidate
        const result = page.locator('#convertedResult');
        await expect(result).toHaveText(candidateText.trim());
    });

    test('should scroll through the page', async ({ page }) => {
        // Scroll to the bottom
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        
        // Scroll back to the top
        await page.evaluate(() => window.scrollTo(0, 0));
        
        await expect(page.locator('h1')).toBeInViewport();
    });
});
