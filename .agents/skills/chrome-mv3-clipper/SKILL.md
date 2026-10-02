---
name: chrome-mv3-clipper
description: >-
  Comprehensive guide and playbook for building Chrome Manifest V3 web clippers
  connecting to local/LAN backends. Covers Private Network Access (PNA CORS), activeTab
  content script injection, popup state management, duplicate detection, and offline fallbacks.
---

# Chrome Manifest V3 Web Clipper Development Guide

This skill covers the design, architecture, and integration patterns for building Manifest V3 browser clippers (such as job clippers, article clippers, bookmark clippers) that interact with local development or LAN servers (e.g. Proxmox, local Docker, localhost).

---

## 1. Chrome Manifest V3 Architecture

### Key Files
```
extension/
├── manifest.json       # Permissions, action, background/popup declaration
├── popup.html          # Clean semantic markup with multi-view state containers
├── popup.css           # Scoped dark/light styles matching main app design
├── popup.js            # Controller managing DOM events, storage, and API fetch
├── extractor.js        # Content script injected into active tabs on demand
└── icons/              # Required PNG icons: 16x16, 48x48, 128x128
```

### Manifest Declarations
```json
{
  "manifest_version": 3,
  "name": "App Clipper",
  "version": "1.0.0",
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": ["http://*/*", "https://*/*"],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Clip to App (Alt+Shift+J)"
  },
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Alt+Shift+J"
      },
      "description": "Open Clipper Popup"
    }
  }
}
```

---

## 2. Private Network Access (PNA) for LAN Backends

### The Chrome >= 142 Constraint
Chrome blocks extensions or web apps from accessing private network IP addresses (like `192.168.x.x` or `10.x.x.x`) unless the server explicitly grants permission via Local Network Access / Private Network Access headers.

### Required Backend CORS Middleware
```ts
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-key');
  res.header('Access-Control-Allow-Private-Network', 'true'); // Critical for PNA!
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});
```

---

## 3. On-Demand DOM Content Extraction

Instead of running content scripts permanently on all websites (which wastes memory and slows browsing), inject `extractor.js` only when the popup opens:

```javascript
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const [result] = await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => {
    // 1. Prioritize user-selected text (cursor selection)
    const selection = window.getSelection()?.toString().trim();
    if (selection && selection.length > 50) {
      return { rawText: selection.slice(0, 7000), linkTitle: document.title, url: window.location.href };
    }
    // 2. Fall back to cleaned DOM body text
    const clone = document.body.cloneNode(true);
    const noiseTags = clone.querySelectorAll('script, style, noscript, nav, footer, header, svg, iframe');
    noiseTags.forEach((el) => el.remove());
    return {
      rawText: clone.innerText.replace(/\s+/g, ' ').trim().slice(0, 7000),
      linkTitle: document.title,
      url: window.location.href
    };
  }
});
```

---

## 4. Resilient API Communication & Fallbacks

1. **Endpoint Evolution Fallback**:
   If a new endpoint (e.g. `/api/jobs/parse-job`) returns `404`, immediately retry with the legacy endpoint (`/api/parse-job`):
   ```javascript
   let res = await fetch(`${serverUrl}/api/jobs/parse-job`, options);
   if (res.status === 404) {
     res = await fetch(`${serverUrl}/api/parse-job`, options);
   }
   ```
2. **Server Connectivity & Status Dot**:
   Use `GET /api/health` with a 3-second `AbortController` timeout to display a live connection indicator (green dot = connected, red = offline).
3. **Duplicate Warning**:
   Before saving, query `GET /api/applications` to check if an application with matching URL or company+role already exists. Offer the user options: "Update Existing" vs "Save as New".
