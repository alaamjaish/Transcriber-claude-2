# Transcriber Desktop App

Desktop wrapper for the Transcriber web application using Electron.

## Quick Start

### 1. Install Dependencies
```bash
cd electron-wrapper
npm install
```

### 2. Update Vercel URL
Open `main.js` and replace this line:
```javascript
const VERCEL_URL = 'https://your-app.vercel.app';
```

With your actual Vercel deployment URL.

### 3. Test Locally
```bash
npm start
```

This will open the desktop app window pointing to your Vercel site.

### 4. Build Mac .dmg
```bash
npm run build:mac
```

Output will be in `dist/` folder: `Transcriber-1.0.0.dmg`

## What This Does

This Electron app is a **wrapper** around your Vercel-hosted web app. It:
- Opens a desktop window
- Loads your Vercel URL
- Provides better microphone permissions
- Feels like a native Mac app

## Important Notes

- **No code duplication:** Uses your existing Vercel deployment
- **Internet required:** Loads content from Vercel
- **Permissions:** Better than Safari for audio recording
- **Your webapp:** Completely unchanged

## Distribution

1. Build the .dmg: `npm run build:mac`
2. Find the file: `dist/Transcriber-1.0.0.dmg`
3. Upload to Google Drive/Dropbox
4. Send link to friend

## Security Note

The .dmg file will show "unidentified developer" warning on Mac.

**To install:**
1. Double-click .dmg
2. Drag app to Applications
3. Right-click → Open (first time only)
4. Click "Open" in dialog

## File Size

~200MB (includes Electron runtime)

## Troubleshooting

### App won't open
- Check that Vercel URL in `main.js` is correct
- Ensure Vercel site is accessible

### Microphone not working
- Check Mac System Preferences → Security & Privacy → Microphone
- Allow the app access

### Build fails
- Run `npm install` again
- Check Node.js version (need 16+)

## Your Web App

Location: `../webapp/`
Status: **COMPLETELY UNTOUCHED** ✅

This Electron wrapper is separate and doesn't modify your web app at all.
