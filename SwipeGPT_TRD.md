# SwipeGPT: Technical Requirements Document (TRD)

## 1. System Architecture
*   **Framework:** Native Chrome Extension (Manifest V3). No external UI frameworks (React/Vue) required for the MVP to maintain maximum performance and lightweight footprint, though modular Vanilla JS is required.
*   **Environment:** Runs directly on `chatgpt.com` (or current OpenAI domains).

**Directory Structure:**
```text
swipegpt/
├── manifest.json
├── content/
│   ├── content.js         # DOM injection & observer
│   ├── cardParser.js      # Text-to-card parsing logic
│   ├── swipeEngine.js     # Physics, gestures, animations
│   └── styles.css         # UI & overlay styles
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # Popup logic & stats display
│   └── popup.css
├── background/
│   └── service-worker.js  # Message routing, global state
├── storage/
│   └── storage.js         # chrome.storage.local wrappers
└── assets/                # Icons, fonts
```

## 2. Data Model
Cards will be managed using `chrome.storage.local`. 

**Card Object Schema:**
```json
{
  "id": "string (uuid)",
  "title": "string",
  "content": "string (HTML or Markdown)",
  "type": "string (list | pros-cons | steps | product)",
  "sourceMessageId": "string (DOM id of the ChatGPT message)",
  "createdAt": "timestamp",
  "status": "string (saved | dismissed | saved-for-later)"
}
```

## 3. Core Technical Components

### 3.1. DOM Integration & Observer (`content.js`)
*   **Constraint:** Do not rely on highly specific, fragile CSS classes. Use structural selectors (e.g., looking for markdown wrappers, lists inside agent responses).
*   **MutationObserver:** Watch for the completion of an AI response. Once generation stops, inject the `[ Swipe this answer ]` button at the bottom of the active response block.
*   **Safety:** Do not modify the original DOM of the ChatGPT response. Overlay the SwipeGPT UI on top using a high `z-index` fixed container.

### 3.2. Deterministic Parser (`cardParser.js`)
*   **MVP Scope:** Implement regex and DOM-traversal based parsing. 
*   **Extraction Targets:** Look for `<ol>`, `<ul>`, `<h3>` followed by `<p>`, and bolded line items.
*   **Extensibility:** Architect this module so an LLM-based parsing function can be seamlessly swapped in later.
*   **Failsafe:** Return a `null` or empty array if confidence in parsing is low, triggering the "Cannot parse this response" UI.

### 3.3. Physics & Animation Engine (`swipeEngine.js`)
*   **Input Handling:** Support `pointerdown`, `pointermove`, `pointerup` for unified mouse/touch handling.
*   **Transformations:** Use `transform: translate3d(x, y, 0) rotate(z)` for hardware-accelerated rendering.
*   **Math:** 
    *   `x` offset maps linearly to pointer movement.
    *   `rotate` maps to `x` (e.g., `rotate = x * 0.05deg`).
    *   Threshold for action trigger: ~40% of screen width or high velocity (`dx/dt`).

## 4. Demo & Testing Mode
*   **Requirement:** A standalone HTML page included in the extension package (`demo/index.html`) to develop and test the `swipeEngine.js` and `cardParser.js` without relying on live ChatGPT DOM changes.
*   **Mocks:** Include hardcoded JSON or HTML strings simulating: 5 project ideas, 5 products, step-by-step explanations, and pros/cons.

## 5. Implementation Phases
1.  **Phase 1: Swipe Engine & Physics:** Build the core visual card stack in the standalone demo environment. Perfect the drag, drop, flick, and spring-back physics.
2.  **Phase 2: ChatGPT DOM Integration:** Setup Manifest V3, inject the activation button safely via MutationObserver.
3.  **Phase 3: Parsing Logic:** Connect the live ChatGPT HTML to the parser to generate the data model.
4.  **Phase 4: State & Storage:** Implement `chrome.storage.local` saving, undo logic, and the Popup dashboard.
5.  **Phase 5: Polish:** Apply final glassmorphism CSS, typography tweaks, and testing.
