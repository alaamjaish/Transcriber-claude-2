const { app, BrowserWindow } = require('electron');
const path = require('path');

// ⚠️ IMPORTANT: Replace this with your actual Vercel URL
const VERCEL_URL = 'https://transcriber-production.vercel.app';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Transcriber',
    backgroundColor: '#ffffff',
  });

  // Load your Vercel-hosted app
  mainWindow.loadURL(VERCEL_URL);

  // Open DevTools in development (remove for production)
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle permission requests for microphone
app.on('web-contents-created', (event, contents) => {
  contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    // Auto-approve microphone permissions
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });
});
