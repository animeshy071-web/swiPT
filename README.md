# 🎴 SwipeGPT

> Transform information-dense ChatGPT answers into a Tinder-style swipeable card interface. 100% offline, private, and free.

[![Chrome MV3](https://img.shields.io/badge/Manifest-V3-6366f1?style=flat-square&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-10b981?style=flat-square)](LICENSE)

---

## ⚡ Why SwipeGPT?
When ChatGPT gives you a list of 10 project ideas, pros & cons, or tutorial steps, reading a wall of text is tedious. **SwipeGPT** injects a non-intrusive `[ 🎴 Swipe this answer ]` button beneath answers, popping up a hardware-accelerated card deck you can evaluate one by one.

* **Swipe Right (→):** Save / Like to local collection
* **Swipe Left (←):** Dismiss / Pass
* **Swipe Up (↑):** Expand full details modal
* **Swipe Down (↓):** Save for later
* **Ctrl + Z:** Instant undo

---

## 🚀 Quick Install (Load Unpacked in 30s)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/animeshy071-web/swiPT.git
   ```
2. Open Google Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (toggle in top-right corner).
4. Click **Load unpacked** and select the `swipegpt` folder inside this repository.
5. Go to [chatgpt.com](https://chatgpt.com), ask for any list, and click **Swipe this answer**!

---

## ✨ Features

* **Deterministic Multi-Strategy Parser:** Extracts cards from numbered lists, bullet points, Markdown headings, and comparison tables without external API calls or latency.
* **Physics & Gestures:** 60fps hardware-accelerated 3D transforms (`translate3d` + rotation mapped to drag distance) with velocity flick and spring-back.
* **Non-Destructive ChatGPT Integration:** Uses a debounced `MutationObserver` and fixed overlay (`z-index: 999999`). Never modifies ChatGPT's DOM or interferes with streaming.
* **Extension Popup Dashboard:**
  * Real-time metrics (*Viewed*, *Saved*, *Dismissed*, *Later*).
  * Saved cards search, 1-click clipboard copy, and deletion.
  * 1-click Markdown export download (`.md`).
  * Customization: Card animations, keyboard shortcuts, and Compact/Comfortable density.
* **Offline & Free:** Zero external network calls, zero tracking, zero API keys required.

---

## 🛠️ Project Architecture

```text
swipegpt/
├── manifest.json              # Chrome MV3 configuration
├── content/
│   ├── cardParser.js          # Multi-strategy HTML/Markdown parser
│   ├── swipeEngine.js         # Gesture physics, velocity & animation engine
│   ├── content.js             # ChatGPT MutationObserver & overlay coordinator
│   └── styles.css             # Glassmorphism dark UI & card stack styling
├── popup/
│   ├── popup.html             # Extension dashboard UI
│   ├── popup.js               # Search, export & settings logic
│   └── popup.css              # Dark neon glassmorphic theme
├── storage/
│   └── storage.js             # chrome.storage.local persistence & undo history
├── assets/                    # Icons (16, 32, 48, 128 px)
└── demo/
    ├── index.html             # Standalone sandbox with physics tuning & telemetry
    ├── chatgpt_mock.html      # ChatGPT DOM stream simulation environment
    └── mockData.js            # Sample SaaS, tutorial & comparison datasets
```

---

## 🧪 Testing

Open `swipegpt/demo/index.html` or `swipegpt/test/parser_test.html` directly in any browser to test physics, gestures, and parser accuracy locally without launching ChatGPT.

---

## 📄 License
MIT © [animeshy071-web](https://github.com/animeshy071-web)
