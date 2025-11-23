const { app, BrowserWindow, desktopCapturer } = require('electron');
const path = require('path');
const os = require('os');

// ⚠️ IMPORTANT: Replace this with your actual Vercel URL
const VERCEL_URL = 'https://transcriber-production.vercel.app';

// 🎯 Enable macOS System Audio Loopback
// Uses Chromium's built-in ScreenCaptureKit/CoreAudioTaps APIs
// to capture system audio without virtual drivers like BlackHole
if (process.platform === 'darwin') {
  const macOSVersion = os.release();
  const darwinMajor = parseInt(macOSVersion.split('.')[0]);

  if (darwinMajor >= 24) {
    // macOS 15+ (Sequoia) - Core Audio Taps API
    app.commandLine.appendSwitch('enable-features',
      'MacLoopbackAudioForScreenShare,MacCatapSystemAudioLoopbackCapture');
    console.log('✅ Enabled Core Audio Taps for macOS 15+');
  } else if (darwinMajor >= 22) {
    // macOS 13-14 (Ventura/Sonoma) - ScreenCaptureKit API
    app.commandLine.appendSwitch('enable-features',
      'MacLoopbackAudioForScreenShare,MacSckSystemAudioLoopbackOverride');
    console.log('✅ Enabled ScreenCaptureKit loopback for macOS 13-14');
  } else {
    console.warn('⚠️ System audio loopback requires macOS 13 (Ventura) or later');
    console.warn('   Current version does not support native system audio capture');
  }
}

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

  // 🧠 AUTO-INTERCEPT: Handle display media requests automatically
  // This removes the manual "Select screen" popup for desktop users
  // When webapp calls navigator.mediaDevices.getDisplayMedia(), this handler
  // automatically selects the primary screen with loopback audio enabled
  mainWindow.webContents.session.setDisplayMediaRequestHandler(
    (request, callback) => {
      console.log('📡 Display media request intercepted:', {
        video: request.video,
        audio: request.audio,
        origin: request.securityOrigin
      });

      // Use desktopCapturer to get available screen sources
      desktopCapturer.getSources({ types: ['screen'] })
        .then((sources) => {
          if (sources.length === 0) {
            console.error('❌ No screen sources available');
            callback(null); // Reject request
            return;
          }

          // Select the primary screen (index 0)
          const primaryScreen = sources[0];

          console.log('✅ Auto-granting display media access:', {
            screenId: primaryScreen.id,
            screenName: primaryScreen.name,
            audioMode: 'loopback'
          });

          // CRITICAL: Pass 'loopback' as audio parameter
          // This enables system audio capture via the flags we set earlier
          callback({
            video: primaryScreen,  // DesktopCapturerSource object
            audio: 'loopback'      // String literal 'loopback' (not boolean!)
          });
        })
        .catch((error) => {
          console.error('❌ Failed to get desktop sources:', error);
          callback(null); // Reject request on error
        });
    }
  );

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
