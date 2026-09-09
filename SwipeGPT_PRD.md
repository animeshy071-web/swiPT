# SwipeGPT: Product Requirements Document (PRD)

## 1. Product Vision & Concept
**SwipeGPT** is a Chrome extension that transforms information-dense ChatGPT answers (lists, recommendations, steps, etc.) into a Tinder-style swipeable card interface. 

The goal is to provide a highly interactive, visual layer over the existing ChatGPT UI to help users quickly sort, save, and evaluate multiple options without losing the core functionality of ChatGPT. It acts as an opt-in reading experience rather than a replacement for the chatbot.

## 2. Target Use Cases
When ChatGPT generates:
*   Project ideas or product recommendations
*   Pros and cons lists
*   Step-by-step tutorials
*   Multiple distinct options or comparisons
*   Learning resources or definitions

## 3. Core Features & Mechanics
### 3.1. Opt-in Activation
*   **Feature:** A lightweight, non-intrusive UI element (e.g., a "Swipe this answer" button) injected beneath the latest ChatGPT response.
*   **Behavior:** Only activates when clicked. If the parser finds no separable items, it displays a graceful error/info message rather than generating empty or broken cards.

### 3.2. The Card Interface (Main View)
*   **Layout:** A centered, stacked card interface overlaying the ChatGPT view. 
*   **Card Anatomy:** Title, main content snippet, pagination indicator (e.g., "1 / 5"), and explicit action buttons matching the gestures.
*   **Gestures & Actions:**
    *   **Swipe Left (←):** Reject / Dismiss
    *   **Swipe Right (→):** Save / Like (persists to local storage)
    *   **Swipe Up (↑):** Expand / Explore details
    *   **Swipe Down (↓):** Save for later
*   **Utility Actions:** Undo previous swipe, Copy card text, Close overlay.

### 3.3. The Extension Popup
*   **Dashboard:** Displays stats (Cards viewed, Cards saved, Cards dismissed).
*   **Navigation:** Deep link to a "Saved Cards" view to review saved items.
*   **Settings:** Toggles for animations, card density, themes, and keyboard shortcuts.

## 4. UX/UI & Design Guidelines
*   **Vibe:** Dark, modern, minimal, premium.
*   **Visuals:** Glassmorphism (blur) backgrounds, subtle gradients, strong typography, soft drop shadows. 
*   **Interaction Design:** 
    *   Cards must follow pointer/finger smoothly.
    *   Rotation depends on horizontal drag distance.
    *   Opacity/scale transitions for background cards.
    *   Velocity-based exit trajectories (flicking the card).
    *   Spring-back animation if a drag is released before the threshold.
