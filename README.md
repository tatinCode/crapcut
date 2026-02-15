#  crapcut
A Chrome extension that saves data and speeds up browsing by giving you control over what gets loaded.
> **Note:** crapcut is currently only available for Google Chrome (Manifest V3). Support for other browsers is not available at this time.

 Modes
| Mode | What it does |
|------|-------------|
| Off | Default browsing. No interference. |
| Low | Blocks ads and trackers using EasyList filter rules. |
| Medium | Low + replaces images with compressed versions. Hover to reveal originals. |
| High | Low + hides all images with placeholders. Hover to reveal originals. |
| Extreme | Low + blocks all images, media, and fonts at the network level. |


 Install
1. Clone the repo:
      ```
   git clone https://github.com/tatinCode/crapcut.git
      ```

3. Install dependencies and build:
    npm install && npm run build

4. Open `chrome://extensions`, enable **Developer Mode**, click **Load unpacked**, and select the `dist/` folder.


 Tech Stack
- TypeScript
- Vite
- Chrome Extension Manifest V3


###### Built during SFHacks 2026
