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
  const captureScript = await fetchScript('https://mcp.figma.com/mcp/html-to-design/capture.js');
  console.log('Script fetched, length:', captureScript.length);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-web-security'],
  });

  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  // Log ALL requests
  page.on('request', req => {
    if (!req.url().startsWith('http://localhost')) {
      console.log(`  REQ: ${req.method()} ${req.url().substring(0, 100)}`);
    }
  });
  page.on('response', resp => {
    if (!resp.url().startsWith('http://localhost')) {
      console.log(`  RESP: ${resp.status()} ${resp.url().substring(0, 100)}`);
    }
  });
  page.on('console', msg => console.log(`  CONSOLE: ${msg.type()}: ${msg.text().substring(0, 200)}`));
  page.on('pageerror', err => console.log(`  PAGE_ERR: ${err.message.substring(0, 200)}`));

  const url = 'http://localhost:8765/screen2-deadstock.html';
  const captureId = '05122d26-34f0-48c8-9004-94b516198aeb';
  const endpoint = `https://mcp.figma.com/mcp/capture/${captureId}/submit`;

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
  console.log('\nPage loaded. Injecting script...');

  await page.addScriptTag({ content: captureScript });
  await page.waitForTimeout(3000);

  // Check state
  const state = await page.evaluate(() => ({
    hasFigma: !!window.figma,
    hasCapture: !!window.figma?.captureForDesign,
    figmaKeys: Object.keys(window.figma || {}),
    typeofCapture: typeof window.figma?.captureForDesign,
  }));
  console.log('\nFigma state:', JSON.stringify(state));

  if (state.hasCapture) {
    console.log('\nTriggering captureForDesign...');
    try {
      const result = await Promise.race([
        page.evaluate(async ({ captureId, endpoint }) => {
          try {
            const r = await window.figma.captureForDesign({ captureId, endpoint, selector: 'body' });
            return { ok: true, result: JSON.stringify(r).substring(0, 200) };
          } catch (e) {
            return { ok: false, error: e.message || String(e) };
          }
        }, { captureId, endpoint }),
        new Promise((resolve) => setTimeout(() => resolve({ ok: false, error: 'timeout 15s' }), 15000))
      ]);
      console.log('Result:', JSON.stringify(result));
    } catch (e) {
      console.log('Evaluate threw:', e.message);
    }
  }

  await page.waitForTimeout(3000);
  try { await context.close(); } catch (e) {}
  await browser.close();
  console.log('Done');
})();
