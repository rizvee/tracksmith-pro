const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Create a flag and capture errors
  let hasError = false;

  page.on('console', msg => {
    if (msg.type() === 'error') {
       console.log('PAGE ERROR LOG:', msg.text());
       hasError = true;
    }
  });
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
    hasError = true;
  });

  await page.goto('http://localhost:3000');

  // Click start, which should initialize the visualizer loop
  await page.click('#btn-master-play');

  // Wait a bit to let it run
  await page.waitForTimeout(3000);

  await browser.close();

  if (hasError) {
    process.exit(1);
  } else {
    console.log("No ReferenceError detected in visualizer loop.");
  }
})();
