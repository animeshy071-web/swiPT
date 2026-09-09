/**
 * SwipeGPT - Content Script (Phase 2)
 * Observes ChatGPT DOM for completed responses, injects the trigger button,
 * and manages the full-screen card swipe overlay.
 */

(() => {
  let overlayEl = null;
  let stageEl = null;
  let toastEl = null;
  let expandModalEl = null;
  let activeEngine = null;
  let activeExpandedCard = null;
  let scanDebounceTimer = null;
  let previousBodyOverflow = '';

  function init() {
    createOverlay();
    observeChatStream();
  }

  function createOverlay() {
    if (document.getElementById('swipegpt-overlay')) return;

    overlayEl = document.createElement('div');
    overlayEl.id = 'swipegpt-overlay';
    overlayEl.className = 'swipegpt-overlay';

    overlayEl.innerHTML = `
      <div class="swipegpt-toast" id="swipegpt-toast">Saved to your collection</div>
      <div class="swipegpt-header">
        <div class="swipegpt-brand">
          <img src="${getAssetUrl('assets/icon32.png')}" alt="Logo" class="swipegpt-logo-img" style="width: 24px; height: 24px; border-radius: 6px;">
          <span>SwipeGPT</span>
          <span class="swipegpt-brand-badge">BETA</span>
        </div>
        <div class="swipegpt-top-actions">
          <button class="swipegpt-icon-btn" id="swipegpt-btn-undo" title="Undo Swipe (Ctrl+Z)">↺</button>
          <button class="swipegpt-icon-btn" id="swipegpt-btn-close" title="Close (Esc)">✕</button>
        </div>
      </div>
      <div class="swipegpt-stage">
        <div class="swipegpt-card-stack" id="swipegpt-card-stack"></div>
      </div>
      <div class="swipegpt-footer-hint">
        <span><kbd class="swipegpt-kbd">←</kbd> Pass</span>
        <span><kbd class="swipegpt-kbd">→</kbd> Save</span>
        <span><kbd class="swipegpt-kbd">↑</kbd> Expand</span>
        <span><kbd class="swipegpt-kbd">↓</kbd> Later</span>
        <span><kbd class="swipegpt-kbd">Esc</kbd> Close</span>
      </div>

      <!-- Expand Detail Modal -->
      <div class="demo-expand-modal" id="swipegpt-expand-modal">
        <div class="modal-content-box">
          <div class="modal-header">
            <h3 class="modal-title" id="swipegpt-modal-title">Card Details</h3>
            <button class="btn-modal-close" id="swipegpt-modal-close-btn">✕</button>
          </div>
          <div class="modal-body" id="swipegpt-modal-body"></div>
          <div class="modal-footer">
            <button class="btn-demo-action" id="swipegpt-modal-copy-btn">📋 Copy Text</button>
            <button class="btn-modal-close" id="swipegpt-modal-done-btn">Done</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlayEl);

    stageEl = overlayEl.querySelector('#swipegpt-card-stack');
    toastEl = overlayEl.querySelector('#swipegpt-toast');
    expandModalEl = overlayEl.querySelector('#swipegpt-expand-modal');

    overlayEl.querySelector('#swipegpt-btn-close').addEventListener('click', closeOverlay);
    overlayEl.querySelector('#swipegpt-btn-undo').addEventListener('click', async () => {
      if (activeEngine) {
        activeEngine.undo();
        const Storage = window.SwipeGPTStorage;
        if (Storage) {
          await Storage.undoLastHistory();
          showToast('↺ Swipe restored');
        }
      }
    });

    // Expand modal event bindings
    const closeModal = () => expandModalEl.classList.remove('active');
    overlayEl.querySelector('#swipegpt-modal-close-btn').addEventListener('click', closeModal);
    overlayEl.querySelector('#swipegpt-modal-done-btn').addEventListener('click', closeModal);
    expandModalEl.addEventListener('click', (e) => {
      if (e.target === expandModalEl) closeModal();
    });

    overlayEl.querySelector('#swipegpt-modal-copy-btn').addEventListener('click', async () => {
      if (activeExpandedCard) {
        const text = `${activeExpandedCard.title}\n\n${activeExpandedCard.plainText || ''}`;
        await navigator.clipboard.writeText(text);
        const btn = overlayEl.querySelector('#swipegpt-modal-copy-btn');
        btn.textContent = '✓ Copied!';
        setTimeout(() => { btn.textContent = '📋 Copy Text'; }, 1500);
      }
    });

    // Close on backdrop click (outside card stage)
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) closeOverlay();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlayEl.classList.contains('active')) {
        if (expandModalEl.classList.contains('active')) {
          closeModal();
        } else {
          closeOverlay();
        }
      }
    });
  }

  function getAssetUrl(relPath) {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      return chrome.runtime.getURL(relPath);
    }
    return relPath;
  }

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('visible');
    setTimeout(() => {
      toastEl.classList.remove('visible');
    }, 2200);
  }

  function openExpandModal(card) {
    if (!expandModalEl) return;
    activeExpandedCard = card;
    overlayEl.querySelector('#swipegpt-modal-title').textContent = card.title;
    overlayEl.querySelector('#swipegpt-modal-body').innerHTML = card.content;
    expandModalEl.classList.add('active');
  }

  async function openOverlay(cards) {
    if (!overlayEl) createOverlay();

    // Lock body scrolling without altering layout
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    overlayEl.classList.add('active');

    const Storage = window.SwipeGPTStorage;
    const settings = Storage ? await Storage.getSettings() : {};

    if (stageEl) {
      if (settings.cardDensity === 'compact') {
        stageEl.closest('.swipegpt-stage')?.classList.add('compact-density');
      } else {
        stageEl.closest('.swipegpt-stage')?.classList.remove('compact-density');
      }
    }

    activeEngine = new window.SwipeGPTEngine({
      container: stageEl,
      cards: cards,
      thresholdRatio: settings.swipeThreshold || 0.35,
      animationsEnabled: settings.animationsEnabled !== false,
      keyboardShortcuts: settings.keyboardShortcuts !== false,
      cardDensity: settings.cardDensity || 'comfortable',
      onAction: async ({ card, direction, action }) => {
        if (action === 'close') {
          closeOverlay();
          return;
        }

        if (direction === 'right') {
          if (Storage) await Storage.saveCard(card);
          showToast('✓ Saved to SwipeGPT');
        } else if (direction === 'left') {
          if (Storage) await Storage.incrementStat('cardsDismissed');
        } else if (direction === 'down') {
          if (Storage) await Storage.incrementStat('cardsLater');
          showToast('⏱ Saved for later');
        } else if (direction === 'up') {
          if (Storage) await Storage.saveCard(card);
          openExpandModal(card);
        }

        if (Storage) {
          await Storage.incrementStat('cardsViewed');
          await Storage.recordSwipeHistory({ card, direction });
        }
      }
    });

    activeEngine.render();
  }

  function closeOverlay() {
    if (!overlayEl) return;
    overlayEl.classList.remove('active');
    document.body.style.overflow = previousBodyOverflow;
    if (activeEngine) {
      activeEngine.destroy();
      activeEngine = null;
    }
  }

  /**
   * Debounced MutationObserver looking for completed assistant responses in ChatGPT
   */
  function observeChatStream() {
    const observer = new MutationObserver(() => {
      if (scanDebounceTimer) clearTimeout(scanDebounceTimer);
      scanDebounceTimer = setTimeout(scanAndInjectButtons, 180);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial pass
    scanAndInjectButtons();
  }

  function scanAndInjectButtons() {
    // Check if the chat response is currently streaming across the page
    const hasActiveStopButton = document.querySelector(
      'button[data-testid="stop-button"], button[aria-label="Stop generating"], .result-streaming'
    );

    // Identify assistant conversation turns using structural selectors
    const assistantTurns = document.querySelectorAll(
      '[data-message-author-role="assistant"], article[data-testid^="conversation-turn-"]:has([data-message-author-role="assistant"]), div.agent-turn, .chatgpt-mock-assistant-turn'
    );

    assistantTurns.forEach((turn, idx) => {
      // Find the markdown content body within the turn
      const markdownContainer = turn.querySelector('.markdown, .prose, [class*="prose"], .turn-content') || turn;
      if (!markdownContainer) return;

      // Avoid re-injecting if already present
      if (turn.querySelector('.swipegpt-trigger-container') || markdownContainer.querySelector('.swipegpt-trigger-container')) {
        return;
      }

      // If this specific turn or last turn is still streaming, wait
      const isTurnStreaming = turn.querySelector('.result-streaming, [class*="streaming"]') ||
        (hasActiveStopButton && idx === assistantTurns.length - 1);

      if (isTurnStreaming) return;

      // Check if there are candidate lists or sections to swipe
      const hasListItems = markdownContainer.querySelector('ol, ul, h2, h3, h4, strong');
      if (!hasListItems) return;

      // Build non-intrusive activation button
      const triggerWrap = document.createElement('div');
      triggerWrap.className = 'swipegpt-trigger-container';
      triggerWrap.innerHTML = `
        <button class="swipegpt-trigger-btn" type="button" title="Transform this answer into swipeable cards">
          <span class="swipegpt-trigger-icon">🎴</span>
          <span>Swipe this answer</span>
        </button>
      `;

      triggerWrap.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        const cards = window.SwipeGPTCardParser?.parse(markdownContainer);
        if (cards && cards.length >= 2) {
          openOverlay(cards);
        } else {
          showToast('No separable list items found in this answer');
        }
      });

      // Append cleanly below markdownContainer or turn action bar
      markdownContainer.appendChild(triggerWrap);
    });
  }

  // Expose methods for testing and initialization
  window.SwipeGPTContent = {
    openOverlay,
    closeOverlay,
    scanAndInjectButtons
  };

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
