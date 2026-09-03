1. Go to chrome://extensions
2. Click on developer mode on top right
3. Click on Load unpacked button
4. Select the extension folder


## How to Load & Test in Different Browsers

### 1. Chromium Browsers (Google Chrome, Microsoft Edge, Brave, Opera, Vivaldi, Arc)
1. Open the browser's extensions page:
   - **Chrome / Arc / Brave**: `chrome://extensions` or `brave://extensions`
   - **Microsoft Edge**: `edge://extensions`
   - **Opera**: `opera://extensions`
2. Enable **Developer mode** toggle.
3. Click **Load unpacked** (or "Load Extension") and select the extension folder:
   ```text
   d:\Atharva\phishing\extension
   ```

### 2. Mozilla Firefox
1. Open Firefox and navigate to:
   ```text
   about:debugging#/runtime/this-firefox
   ```
2. Click **Load Temporary Add-on...**
3. Select the `manifest.json` file inside:
   ```text
   d:\Atharva\phishing\extension\manifest.json
   ```
4. The extension will load immediately with the active shield icon in the toolbar.