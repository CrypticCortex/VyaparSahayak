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

(async () => {
  const captureId = '89bff53a-45a0-49b9-a58e-a8e0cc61ea77';
  const url = 'http://localhost:8765/screen3-recommendation.html';

  console.log('Fetching Figma capture script...');
  const captureScript = await fetchScript('https://mcp.figma.com/mcp/html-to-design/capture.js');
  console.log('Script fetched, length:', captureScript.length);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-web-security'],
  });

  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();

  let captureSubmitted = false;

  page.on('request', (req) => {
    if (req.url().includes('mcp.figma.com/mcp/capture/') && req.method() === 'POST') {
      console.log('Capture POST detected!');
      captureSubmitted = true;
    }
  });

  page.on('response', (resp) => {
    if (resp.url().includes('mcp.figma.com/mcp/capture/')) {
      console.log(`Capture response: ${resp.status()}`);
    }
  });

  try {
    // First load the page without hash
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Inject the script manually
    await page.addScriptTag({ content: captureScript });
    await page.waitForTimeout(2000);

    const endpoint = `https://mcp.figma.com/mcp/capture/${captureId}/submit`;

    // Try calling captureForDesign
    try {
      await Promise.race([
        page.evaluate(async ({ captureId, endpoint }) => {
          return await window.figma.captureForDesign({
            captureId,
            endpoint,
            selector: 'body',
          });
        }, { captureId, endpoint }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('eval timeout')), 15000))
      ]);
    } catch (e) {
      if (captureSubmitted) {
        console.log('Capture submitted successfully (page closed after POST)!');
      } else {
        console.log('Evaluate error:', e.message);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
    if (captureSubmitted) console.log('But capture was submitted!');
  }

  try { await context.close(); } catch (e) {}
  await browser.close();
  console.log('Done!');
})();
