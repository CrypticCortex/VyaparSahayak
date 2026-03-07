const puppeteer = require('puppeteer');

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
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const screen of screens) {
    console.log(`\nCapturing: ${screen.name}`);
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812 });

    try {
      await page.goto(screen.url, { waitUntil: 'networkidle0', timeout: 15000 });

      // Fetch and inject the Figma capture script
      const captureScriptResponse = await page.context().request?.get?.(
        'https://mcp.figma.com/mcp/html-to-design/capture.js'
      );

      // Alternative: use page.evaluate to fetch and inject
      await page.evaluate(async () => {
        const resp = await fetch('https://mcp.figma.com/mcp/html-to-design/capture.js');
        const scriptText = await resp.text();
        const el = document.createElement('script');
        el.textContent = scriptText;
        document.head.appendChild(el);
      });

      // Wait for the script to initialize
      await page.waitForTimeout(2000);

      // Trigger the capture
      const endpoint = `https://mcp.figma.com/mcp/capture/${screen.captureId}/submit`;
      const result = await page.evaluate(
        ({ captureId, endpoint }) => {
          if (window.figma && window.figma.captureForDesign) {
            return window.figma.captureForDesign({
              captureId,
              endpoint,
              selector: 'body',
            });
          }
          return { error: 'figma.captureForDesign not found' };
        },
        { captureId: screen.captureId, endpoint }
      );

      console.log(`Result for ${screen.name}:`, JSON.stringify(result));
    } catch (err) {
      console.error(`Error capturing ${screen.name}:`, err.message);
    }

    await page.close();
  }

  await browser.close();
  console.log('\nAll captures submitted!');
})();
