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
    name: 'Screen 1 - Home Dashboard',
    url: 'http://localhost:8765/screen1-home.html',
    captureId: '50347533-9695-45d7-bf14-32ec1fdab6e7',
  },
  {
    name: 'Screen 2 - Dead Stock Detail',
    url: 'http://localhost:8765/screen2-deadstock.html',
    captureId: '100bb43c-790b-4d64-9bd0-8b7012d324cf',
  },
  {
    name: 'Screen 3 - AI Recommendation',
    url: 'http://localhost:8765/screen3-recommendation.html',
    captureId: '298b5f24-ee94-4343-a3e9-5abcc5bce570',
  },
  {
    name: 'Screen 4 - Campaign Sender',
    url: 'http://localhost:8765/screen4-campaign.html',
    captureId: '9b324dae-736e-48e7-b3e0-5e3a8e8ef1a4',
  },
];

(async () => {
  console.log('Fetching Figma capture script...');
  const captureScript = await fetchScript('https://mcp.figma.com/mcp/html-to-design/capture.js');
  console.log('Script fetched, length:', captureScript.length);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-web-security'],
  });

  for (const screen of screens) {
    console.log(`\n--- Capturing: ${screen.name} ---`);
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();

    let captureSubmitted = false;

    // Listen for the POST request to Figma's capture endpoint
    page.on('request', (req) => {
      if (req.url().includes('mcp.figma.com/mcp/capture/') && req.method() === 'POST') {
        console.log('  Capture POST detected!');
        captureSubmitted = true;
      }
    });

    page.on('response', (resp) => {
      if (resp.url().includes('mcp.figma.com/mcp/capture/')) {
        console.log(`  Capture response: ${resp.status()}`);
      }
    });

    page.on('pageerror', (err) => {
      console.log('  Page error:', err.message.substring(0, 100));
    });

    try {
      // Navigate with the hash fragment which triggers auto-capture
      const hashUrl = `${screen.url}#figmacapture=${screen.captureId}&figmaendpoint=${encodeURIComponent(`https://mcp.figma.com/mcp/capture/${screen.captureId}/submit`)}&figmadelay=1000`;

      await page.goto(hashUrl, { waitUntil: 'load', timeout: 10000 });

      // The HTML already has the capture script tag, and the hash params trigger auto-capture
      // Wait for the capture to happen
      console.log('  Waiting for auto-capture...');

      // Wait up to 15 seconds for capture submission
      for (let i = 0; i < 15; i++) {
        await page.waitForTimeout(1000);
        if (captureSubmitted) {
          console.log('  Capture submitted successfully!');
          break;
        }
        if (i === 14) {
          console.log('  Timeout waiting for capture. Trying manual trigger...');

          // Try manual injection and trigger
          await page.addScriptTag({ content: captureScript });
          await page.waitForTimeout(2000);

          try {
            await Promise.race([
              page.evaluate(async ({ captureId, endpoint }) => {
                return await window.figma.captureForDesign({
                  captureId,
                  endpoint,
                  selector: 'body',
                });
              }, {
                captureId: screen.captureId,
                endpoint: `https://mcp.figma.com/mcp/capture/${screen.captureId}/submit`
              }),
              new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))
            ]);
          } catch (e) {
            if (captureSubmitted) {
              console.log('  Capture submitted (caught after page close)!');
            } else {
              console.log('  Manual trigger failed:', e.message);
            }
          }
        }
      }

    } catch (err) {
      if (captureSubmitted) {
        console.log('  Capture was submitted before error (OK)');
      } else {
        console.error(`  Error: ${err.message}`);
      }
    }

    try { await context.close(); } catch (e) {}
  }

  await browser.close();
  console.log('\nAll done!');
})();
