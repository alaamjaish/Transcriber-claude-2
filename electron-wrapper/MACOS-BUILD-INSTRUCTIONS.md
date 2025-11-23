# macOS Build Instructions

## Overview
This Electron app now includes **automatic system audio capture** for macOS users with headphones. No more manual screen-share popups!

## What Changed
✅ **Automatic loopback audio** - System audio captured without screen-share dialog
✅ **Works with headphones** - Both teacher and student audio transcribed
✅ **Still auto-updates** - Loads latest webapp from Vercel (no rebuild needed for app updates)

---

## Building on macOS

### Prerequisites
- macOS 13 (Ventura) or later (for system audio loopback)
- Node.js installed (v18 or later)
- Xcode Command Line Tools (for code signing)

### Build Steps

1. **Navigate to electron-wrapper directory:**
   ```bash
   cd electron-wrapper
   ```

2. **Install dependencies (if not already installed):**
   ```bash
   npm install
   ```

3. **Build the DMG:**
   ```bash
   npm run build:mac
   ```

4. **Find the installer:**
   - Output: `electron-wrapper/dist/Transcriber-1.0.0.dmg`
   - Double-click to mount
   - Drag to Applications folder
   - Done!

---

## First-Time Setup (For End Users)

### Step 1: Install the App
1. Download `Transcriber-1.0.0.dmg`
2. Double-click to mount
3. Drag "Transcriber" to Applications
4. Open from Applications folder

### Step 2: Grant Permissions

#### Microphone Permission
- First recording: macOS will ask for microphone access
- Click **"Allow"**
- This is a one-time permission

#### Screen Recording Permission (IMPORTANT!)
- First recording: macOS may ask for "Screen Recording" permission
- This is **required** for system audio capture
- **How to grant:**
  1. System Settings → Privacy & Security → Screen Recording
  2. Find "Transcriber" in the list
  3. Toggle it **ON**
  4. Restart the app if it was already running

**Why Screen Recording?** macOS requires this permission to capture system audio (it's not actually recording your screen, just the audio).

---

## Using the App

### Recording with Headphones

1. **Open Transcriber** from Applications
2. **Navigate to Recordings page**
3. **Select a student** (or create new one)
4. **Check the toggle:** "I'm using my headphones"
5. **Click "Start Recording"**
6. **Grant permissions** (if first time):
   - Microphone → Allow
   - Screen Recording → Allow (in System Settings)
7. **Start teaching!**
   - Speak into mic → Teacher audio transcribed ✅
   - Play videos/student talking → Student audio transcribed ✅
   - Both captured automatically, no popups! 🎉

### What to Expect

✅ **First recording:**
- Mic permission popup (one time)
- Possible Screen Recording permission prompt (one time)
- After granting: Smooth recording starts

✅ **Subsequent recordings:**
- Click "Start Recording"
- Recording begins immediately
- No popups, no manual selection needed!

---

## Troubleshooting

### Problem: No system audio captured
**Solution:** Check Screen Recording permission
1. System Settings → Privacy & Security → Screen Recording
2. Make sure "Transcriber" is enabled (toggle ON)
3. Restart the app

### Problem: macOS says app is damaged
**Solution:** Remove quarantine flag
```bash
xattr -cr /Applications/Transcriber.app
```

### Problem: Recording starts but only mic audio works
**Solution:**
1. Make sure "I'm using headphones" toggle is **checked**
2. Verify you're on macOS 13+ (check: System Settings → General → About)
3. Check console logs (View → Developer → Toggle Developer Tools)
   - Should see: `✅ Enabled ScreenCaptureKit loopback for macOS 13-14`

### Problem: Screen Recording permission not working
**Solution:**
1. System Settings → Privacy & Security → Screen Recording
2. Remove "Transcriber" from list
3. Close and reopen the app
4. Grant permission again when prompted

---

## Technical Details

### macOS Version Support

| macOS Version | System Audio | Notes |
|---------------|--------------|-------|
| Monterey 12.x | ❌ No | Manual screen-share still required |
| Ventura 13.x | ✅ Yes | Uses ScreenCaptureKit API |
| Sonoma 14.x | ✅ Yes | Uses ScreenCaptureKit API |
| Sequoia 15.x | ✅ Yes | Uses Core Audio Taps API |

### What Happens Behind the Scenes

1. **Chromium flags enabled** at app startup:
   - `MacLoopbackAudioForScreenShare`
   - `MacSckSystemAudioLoopbackOverride` (macOS 13-14)
   - `MacCatapSystemAudioLoopbackCapture` (macOS 15+)

2. **Display media request intercepted** by Electron:
   - Webapp calls `navigator.mediaDevices.getDisplayMedia()`
   - Electron auto-approves with `audio: 'loopback'`
   - No user popup shown!

3. **System audio flows** directly to transcription:
   - Microphone audio: User's voice
   - System audio: YouTube, Zoom, student's voice
   - Both mixed and sent to Soniox

### Logs to Check (Developer Tools)

```
✅ Enabled ScreenCaptureKit loopback for macOS 13-14
📡 Display media request intercepted: { video: true, audio: true, origin: '...' }
✅ Auto-granting display media access: { screenId: '...', screenName: 'Color LCD', audioMode: 'loopback' }
```

---

## Comparison: Before vs After

### BEFORE (Old Behavior)
1. Check "I'm using headphones" toggle
2. Click "Start Recording"
3. Approve microphone → OK
4. **Screen share popup appears** ⬅️ FRICTION
5. **Manually select screen** ⬅️ FRICTION
6. **Manually check "Share audio"** ⬅️ FRICTION
7. Click "Share"
8. Recording starts (~15 seconds total)

### AFTER (New Behavior)
1. Check "I'm using headphones" toggle
2. Click "Start Recording"
3. Approve microphone → OK
4. Recording starts immediately! (~5 seconds total)

*(First time: May need to grant Screen Recording permission in System Settings)*

---

## Auto-Update Workflow

The desktop app loads the webapp from Vercel:
- **Webapp updates:** Instant (just push to GitHub → Vercel deploys)
- **Electron updates:** Only needed if changing desktop-specific code

This means you can update the recording interface, AI features, UI, etc. **without rebuilding the Electron app**!

---

## Building from Source (Developers)

If you need to modify the Electron wrapper:

```bash
# Clone repo
git clone https://github.com/alaamjaish/Transcriber-claude-2.git
cd Transcriber-claude-2/electron-wrapper

# Install dependencies
npm install

# Test locally (development mode)
npm start

# Build for production
npm run build:mac

# Output: dist/Transcriber-1.0.0.dmg
```

---

## Support

If you encounter issues:
1. Check console logs (Developer Tools)
2. Verify macOS version (13+ required)
3. Confirm Screen Recording permission enabled
4. Try restarting the app after granting permissions

---

**Built with:** Electron 28, Chromium 120, ScreenCaptureKit API
**Last updated:** November 2025
