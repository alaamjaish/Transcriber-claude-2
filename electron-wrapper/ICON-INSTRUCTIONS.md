# App Icon Instructions

## You Need an Icon

Add a file called `icon.png` to this folder (electron-wrapper/).

### Requirements:
- **Format:** PNG
- **Size:** 512x512 pixels minimum (1024x1024 recommended)
- **Name:** Must be exactly `icon.png`

### Quick Options:

**Option 1: Use a placeholder**
- Download any 512x512 PNG from the internet
- Rename it to `icon.png`
- Put it in this folder

**Option 2: Create your own**
- Use Canva/Figma to make a simple logo
- Export as PNG, 1024x1024
- Save as `icon.png` here

**Option 3: Use text**
- Go to https://favicon.io/favicon-generator/
- Create a simple letter icon (like "T" for Transcriber)
- Download and rename to `icon.png`

### For Now:
The build will work without an icon, but the app will use Electron's default icon (generic).

### Mac Specific:
If you want a proper Mac .icns file later, use:
- https://cloudconvert.com/png-to-icns
- Upload your icon.png
- Download icon.icns
- Add to project

But `icon.png` works fine for now!
