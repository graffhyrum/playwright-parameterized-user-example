const { chromium } = require('playwright/test');
const { writeFileSync } = require('node:fs');

const url = process.argv[2];
const outputPath = process.argv[3];

if (!url || !outputPath) {
  console.error('Usage: node screenshot-helper.cjs <url> <output-path>');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 10000 });
    await page.waitForTimeout(3000);

    const screenshot = await page.screenshot({ fullPage: true });
    writeFileSync(outputPath, screenshot);
    console.log(`✓ Screenshot saved: ${outputPath}`);
  } catch (error) {
    console.error('❌ Screenshot failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
