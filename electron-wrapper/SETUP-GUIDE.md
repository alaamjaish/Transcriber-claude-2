# 🚀 Electron Setup Guide - Step by Step

## ✅ DONE - What We've Built

Files created in `electron-wrapper/` folder:
- ✅ `package.json` - Electron configuration
- ✅ `main.js` - App main process
- ✅ `preload.js` - Security bridge
- ✅ `README.md` - Documentation
- ✅ Dependencies installed (~323 packages)

**Your webapp/** folder: **UNTOUCHED** ✅

---

## 🔧 NEXT STEPS - What YOU Need to Do

### Step 1: Update Your Vercel URL

1. **Find your Vercel URL:**
   - Go to https://vercel.com
   - Find your deployment
   - Copy the URL (like: `https://transcriber-claude-2.vercel.app`)

2. **Update main.js:**
   - Open: `electron-wrapper/main.js`
   - Find line 6: `const VERCEL_URL = 'https://your-app.vercel.app';`
   - Replace with your actual URL
   - Save the file

**Example:**
```javascript
// Change this:
const VERCEL_URL = 'https://your-app.vercel.app';

// To this (your actual URL):
const VERCEL_URL = 'https://transcriber-claude-2.vercel.app';
```

---

### Step 2: Add an App Icon (Optional)

**Quick option:** Skip for now, use default icon

**If you want a custom icon:**
1. Create/find a 512x512 PNG image
2. Name it `icon.png`
3. Put it in `electron-wrapper/` folder

See `ICON-INSTRUCTIONS.md` for details.

---

### Step 3: Test Locally

```bash
cd electron-wrapper
npm start
```

**What should happen:**
- Desktop window opens
- Shows your Vercel site
- Works like a browser

**Troubleshooting:**
- If nothing opens: Check Vercel URL in main.js
- If shows error: Make sure Vercel site is accessible
- If crashes: Check terminal for error messages

---

### Step 4: Build the Mac .dmg

**On a Mac:**
```bash
cd electron-wrapper
npm run build:mac
```

**What happens:**
- Takes 2-5 minutes
- Creates `dist/` folder
- Outputs: `Transcriber-1.0.0.dmg`

**Output location:**
```
electron-wrapper/
  └── dist/
      └── Transcriber-1.0.0.dmg  ← This is what you send!
```

**File size:** ~200MB

---

### Step 5: Send to Your Friend

1. **Find the file:**
   ```
   electron-wrapper/dist/Transcriber-1.0.0.dmg
   ```

2. **Upload it:**
   - Google Drive
   - Dropbox
   - WeTransfer
   - Any file sharing service

3. **Send instructions:** (Copy-paste this)
   ```
   Hey! Here's the desktop app:

   1. Download the .dmg file
   2. Double-click it
   3. Drag the app icon to Applications folder
   4. Open it from Applications
   5. First time: Right-click → Open → Click "Open"
   6. Use it like normal!

   (It needs internet to work)
   ```

---

## 🛠️ Commands Reference

```bash
# Install dependencies (already done)
npm install

# Test locally
npm start

# Build for Mac
npm run build:mac

# Build for Windows (if needed)
npm run build:win
```

---

## 📁 Folder Structure

```
your-project/
  ├── webapp/              ← YOUR APP (UNCHANGED!)
  ├── electron-wrapper/    ← NEW - Desktop wrapper
  │   ├── dist/            ← Build output (.dmg file here)
  │   ├── node_modules/    ← Dependencies
  │   ├── main.js          ← Main Electron code
  │   ├── preload.js       ← Security bridge
  │   ├── package.json     ← Config
  │   └── README.md        ← Documentation
  └── docs/
      └── ELECTRON-PLAN.md ← Original plan
```

---

## ⚠️ Important Notes

### Your Web App
- **Location:** `webapp/` folder
- **Status:** Completely unchanged
- **Still works:** Yes, exactly the same
- **Vercel:** Still deployed, still working

### Electron App
- **What it does:** Shows your Vercel site in a window
- **Internet:** Required (loads from Vercel)
- **Updates:** When you update Vercel, Electron app shows new version
- **No maintenance:** Once built, the .dmg works forever

### Security Warning on Mac
- Your friend will see "unidentified developer"
- **Solution:** Right-click → Open → Click "Open"
- **Why:** You haven't paid $99 for Apple Developer account
- **Is it safe:** Yes, it's your code

---

## 🐛 Troubleshooting

### npm install fails
```bash
# Try:
npm cache clean --force
npm install
```

### npm start doesn't work
- Check Vercel URL in main.js is correct
- Try: `npm install` again

### Build fails
- Make sure you're on a Mac (for Mac builds)
- Check Node.js version: `node --version` (need 16+)
- Try: `npm install` again

### App opens but blank screen
- Check Vercel URL is accessible in browser
- Check internet connection
- Open DevTools: Uncomment line in main.js

---

## 📊 What You Built

**Lines of code:** ~100
**Files created:** 5
**Dependencies:** 323 packages
**Build output:** 1 .dmg file (~200MB)
**Time spent:** ~1.5 hours
**Your webapp affected:** 0%

**Result:** A Mac desktop app your friend can install and use!

---

## 🎯 Next Steps Checklist

- [ ] Update Vercel URL in main.js
- [ ] (Optional) Add icon.png
- [ ] Test with `npm start`
- [ ] Build with `npm run build:mac`
- [ ] Upload .dmg to sharing service
- [ ] Send link + instructions to friend
- [ ] Done! 🎉

---

## 🤔 Questions?

**Q: Can I delete electron-wrapper later?**
A: Yes! Just delete the folder. Your webapp is unchanged.

**Q: Do I need to rebuild for every Vercel update?**
A: No! Electron loads from Vercel, so updates are automatic.

**Q: Can I use this on Windows?**
A: Different build command: `npm run build:win` (creates .exe)

**Q: File size too big?**
A: That's normal. Electron bundles a browser (~200MB)

**Q: My friend can't install it**
A: Send them the "Right-click → Open" instructions

---

**You're ready to go! Update that Vercel URL and test it! 🚀**
