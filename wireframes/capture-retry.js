const { chromium } = require('playwright');
const https = require('https');

function fetchScript(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

const screens = [
  {
    name: 'Screen 2 - Dead Stock Detail',
    url: 'http://localhost:8765/screen2-deadstock.html',
    captureId: '05122d26-34f0-48c8-9004-94b516198aeb',
  },
  {
    name: 'Screen 3 - AI Recommendation',
    url: 'http://localhost:8765/screen3-recommendation.html',
    captureId: '4098ee48-90eb-4d26-aa0c-9eac80dd8321',
  },
  {
    name: 'Screen 4 - Campaign Sender',
    url: 'http://localhost:8765/screen4-campaign.html',
    captureId: '1f8689f4-e8be-47b9-8047-75f43e16d1b1',
  },
];

(async () => {
  console.log('Fetching Figma capture script...');
  const captureScript = await fetchScript('https://mcp.figma.com/mcp/html-to-design/capture.js');
  console.log('Script fetched, length:', captureScript.length);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-web-security',
      '--ignore-certificate-errors',
      '--allow-running-insecure-content',
    ],
  });

  for (const screen of screens) {
    console.log(`\n--- ${screen.name} ---`);
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    page.on('console', msg => {
      if (msg.text().includes('Figma Capture')) {
        console.log(`  ${msg.text()}`);
      }
    });

    try {
      await page.goto(screen.url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(500);
      await page.addScriptTag({ content: captureScript });
      await page.waitForTimeout(2000);

      const endpoint = `https://mcp.figma.com/mcp/capture/${screen.captureId}/submit`;

      // Use waitForResponse + evaluate in parallel
      const [response] = await Promise.all([
        page.waitForResponse(
          resp => resp.url().includes('mcp.figma.com') && resp.request().method() === 'POST',
          { timeout: 30000 }
        ),
        page.evaluate(({ captureId, endpoint }) => {
          window.figma.captureForDesign({ captureId, endpoint, selector: 'body' });
        }, { captureId: screen.captureId, endpoint }).catch(() => {})
      ]);

      console.log(`  POST response: ${response.status()}`);
      if (response.status() === 200 || response.status() === 201) {
        console.log('  SUCCESS!');
      }
    } catch (err) {
      console.error(`  Error: ${err.message.substring(0, 100)}`);
    }

    try { await context.close(); } catch (e) {}
  }

  await browser.close();
  console.log('\nAll captures done!');
})();
