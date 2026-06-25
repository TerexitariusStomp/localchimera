const { remote } = require('webdriverio');
const fs = require('fs');
const path = require('path');

const TEST_WALLET = '0x1234567890123456789012345678901234567890';

async function runTest() {
  console.log('Starting TestingBot smoke test...');
  console.log('App URL:', process.env.TESTINGBOT_APP_URL);

  const browser = await remote({
    user: process.env.TESTINGBOT_KEY,
    key: process.env.TESTINGBOT_SECRET,
    hostname: 'hub.testingbot.com',
    protocol: 'https',
    port: 443,
    path: '/wd/hub',
    connectionRetryTimeout: 120000,
    capabilities: {
      'tb:options': {
        name: 'Chimera Smoke Test',
        build: `build-${process.env.GITHUB_RUN_ID || 'local'}`,
      },
      platformName: 'Android',
      'appium:app': process.env.TESTINGBOT_APP_URL,
      'appium:deviceName': 'Pixel 6',
      'appium:platformVersion': '12',
      'appium:automationName': 'UiAutomator2',
    },
  });

  let success = false;
  let failureReason = '';

  try {
    await browser.pause(8000);
    await browser.saveScreenshot(path.join(__dirname, 'screenshot-01-launch.png'));
    console.log('Screenshot 1: setup screen');

    // Find the wallet input
    let walletInput = null;
    const walletSelectors = [
      'android.widget.EditText',
      '//android.widget.EditText',
      '//*[contains(@text, "EVM wallet")]',
      'android=new UiSelector().className("android.widget.EditText")',
    ];
    for (const sel of walletSelectors) {
      try {
        const el = await browser.$(sel);
        if (await el.isExisting()) {
          walletInput = el;
          console.log('Found wallet input with selector:', sel);
          break;
        }
      } catch (e) {}
    }

    if (!walletInput) {
      failureReason = 'Wallet address input not found on setup screen';
      console.log(failureReason);
      try {
        const source = await browser.getPageSource();
        fs.writeFileSync(path.join(__dirname, 'page-source.xml'), source);
      } catch (e) {}
    } else {
      await walletInput.setValue(TEST_WALLET);
      console.log('Entered wallet address');
      await browser.pause(1000);
      await browser.saveScreenshot(path.join(__dirname, 'screenshot-02-wallet-entered.png'));

      // Find and tap the Start button
      let startBtn = null;
      const startSelectors = [
        '//*[contains(@text, "Start")]',
        '//android.widget.Button[contains(@text, "Start")]',
        'android=new UiSelector().textContains("Start")',
      ];
      for (const sel of startSelectors) {
        try {
          const el = await browser.$(sel);
          if (await el.isExisting()) {
            startBtn = el;
            console.log('Found Start button with selector:', sel);
            break;
          }
        } catch (e) {}
      }

      if (!startBtn) {
        failureReason = 'Start button not found';
        console.log(failureReason);
      } else {
        await startBtn.click();
        console.log('Tapped Start button');
        await browser.pause(3000);
        await browser.saveScreenshot(path.join(__dirname, 'screenshot-03-after-start.png'));

        // Wait for model load: success is the WebView appearing (setup screen gone)
        const startTime = Date.now();
        let lastProgress = '';
        while (Date.now() - startTime < 240000) {
          await browser.saveScreenshot(path.join(__dirname, 'screenshot-04-checking.png'));

          // Check for error text
          try {
            const errorEl = await browser.$('//*[contains(@text, "Model error") or contains(@text, "error")]');
            if (await errorEl.isExisting()) {
              const txt = await errorEl.getText();
              console.log('Error text:', txt);
              failureReason = txt;
              break;
            }
          } catch (e) {}

          // Check for loading progress text
          try {
            const loadingEl = await browser.$('//*[contains(@text, "loading model")]');
            if (await loadingEl.isExisting()) {
              const txt = await loadingEl.getText();
              if (txt !== lastProgress) {
                console.log('Progress:', txt);
                lastProgress = txt;
              }
            }
          } catch (e) {}

          // Success: setup screen elements are gone and WebView is present
          try {
            const walletInputCheck = await browser.$('//*[contains(@text, "EVM wallet")]');
            const startBtnCheck = await browser.$('//*[contains(@text, "Start")]');
            const inputExists = await walletInputCheck.isExisting();
            const btnExists = await startBtnCheck.isExisting();
            if (!inputExists && !btnExists) {
              console.log('SUCCESS: Setup screen passed — WebView is showing');
              success = true;
              break;
            }
          } catch (e) {}

          await browser.pause(5000);
        }

        if (!success && !failureReason) {
          failureReason = 'Timed out waiting for model load result';
        }
      }
    }

    try {
      const logcat = await browser.execute('mobile: shell', { command: 'logcat', args: ['-d', '-t', '500'] });
      fs.writeFileSync(path.join(__dirname, 'logcat.txt'), logcat || '(empty)');
      console.log('Logcat saved to logcat.txt');
    } catch (e) { console.log('Could not capture logcat:', e.message); }
  } catch (e) {
    console.error('Test error:', e);
    failureReason = e.message;
  } finally {
    await browser.deleteSession();
  }

  if (success) {
    console.log('\n=== TEST PASSED ===');
    process.exit(0);
  } else {
    console.log('\n=== TEST FAILED ===');
    console.log('Reason:', failureReason);
    process.exit(1);
  }
}

runTest();
