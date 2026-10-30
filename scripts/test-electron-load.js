const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
  });

  console.log('Testing Electron loadURL...');
  
  win.webContents.on('did-finish-load', () => {
    console.log('RESULT: SUCCESS_LOADED');
    win.webContents.executeJavaScript('document.title').then(title => {
      console.log('PAGE TITLE:', title);
      app.quit();
    }).catch(err => {
      console.error('JS eval error:', err);
      app.quit();
    });
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`RESULT: FAILED code=${errorCode} desc=${errorDescription} url=${validatedURL}`);
    app.quit();
  });

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`RENDERER CONSOLE [${level}]:`, message);
  });

  const testUrl = process.env.TEST_URL || 'https://exmark-erp-staging.onrender.com';
  console.log('Loading URL:', testUrl);
  win.loadURL(testUrl);
});
