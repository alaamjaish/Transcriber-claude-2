# 🚀 How to Build Mac .dmg Using GitHub Actions

## You're on Windows, but GitHub has Mac servers!

---

## Step-by-Step Guide

### Step 1: Push to GitHub

```bash
# Go to project root
cd "C:\Users\Alaa M. Jaish\Desktop\Programming\Agentic_JOURNEY\cc\windsurf-claude - Copy (2)"

# Add all electron files
git add .

# Commit
git commit -m "Add Electron desktop app wrapper"

# Push to GitHub
git push origin main
```

---

### Step 2: Trigger GitHub Actions

**Option A: Automatic (Already triggered by push)**
- GitHub sees the push
- Automatically starts building
- Takes ~5-10 minutes

**Option B: Manual Trigger**
1. Go to your GitHub repo: https://github.com/alaamjaish/Transcriber-claude-2
2. Click "Actions" tab
3. Click "Build Electron App for Mac"
4. Click "Run workflow" button
5. Click green "Run workflow"
6. Wait ~5-10 minutes

---

### Step 3: Download the .dmg

1. **Go to GitHub repo Actions tab:**
   ```
   https://github.com/alaamjaish/Transcriber-claude-2/actions
   ```

2. **Find your workflow run:**
   - Look for "Build Electron App for Mac"
   - Should show green checkmark ✅ when done

3. **Download the artifact:**
   - Click on the workflow run
   - Scroll down to "Artifacts" section
   - Click "Transcriber-Mac-dmg"
   - Downloads a .zip file

4. **Extract the .dmg:**
   - Unzip the file
   - Inside: `Transcriber-1.0.0.dmg`
   - That's it! 🎉

---

### Step 4: Send to Your Mac Friend

1. **Upload the .dmg to:**
   - Google Drive
   - Dropbox
   - WeTransfer
   - Any file sharing

2. **Send this message:**
   ```
   Hey! Here's the Mac desktop app for Transcriber:

   [Link to .dmg file]

   To install:
   1. Download the .dmg
   2. Double-click it
   3. Drag the app icon to Applications folder
   4. Open from Applications
   5. First time: Right-click → Open → Click "Open"
      (This bypasses the "unidentified developer" warning)
   6. Use it normally!

   Note: Needs internet connection to work.
   ```

---

## What GitHub Actions Does

```
GitHub's Mac Server
    ↓
Installs Node.js
    ↓
Installs Electron dependencies
    ↓
Builds Mac .dmg
    ↓
Uploads as artifact (you download it)
```

**Cost:** FREE ✅
**Time:** 5-10 minutes
**Your effort:** Just push to GitHub!

---

## Troubleshooting

### Build fails?

**Check the logs:**
1. Go to Actions tab
2. Click failed workflow
3. Read error messages

**Common fixes:**
- Make sure `package-lock.json` exists in electron-wrapper/
- Run `npm install` in electron-wrapper/ first
- Push again

### Can't find artifact?

- Wait for workflow to finish (green checkmark)
- Artifacts section is at bottom of workflow page
- Available for 30 days

### Need to rebuild?

**Just push again:**
```bash
git commit --allow-empty -m "Rebuild"
git push origin main
```

Or use manual trigger in Actions tab.

---

## Workflow File Location

`.github/workflows/build-electron-mac.yml`

This file tells GitHub what to do automatically!

---

## Timeline

1. **Push code** - 30 seconds
2. **GitHub builds** - 5-10 minutes (you wait)
3. **Download .dmg** - 1 minute
4. **Upload & send** - 2 minutes

**Total:** ~15 minutes, mostly automated!

---

## Pro Tip: Create a Release

**Want a permanent download link?**

```bash
# Tag your code
git tag v1.0.0
git push origin v1.0.0
```

GitHub will:
- Build the .dmg
- Create a Release page
- Attach the .dmg
- Give you a permanent link!

---

**Ready? Push to GitHub and watch the magic happen! 🚀**

```bash
git add .
git commit -m "Add Electron desktop app wrapper"
git push origin main
```

Then go to: https://github.com/alaamjaish/Transcriber-claude-2/actions
