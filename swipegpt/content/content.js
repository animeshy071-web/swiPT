/**
 * SwipeGPT - Content Script
 * Observes ChatGPT DOM for completed responses, injects the trigger button,
 * manages the full-screen card swipe overlay, and integrates @swiPT context into prompts.
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
  let currentTheme = 'crt';

  // Active swipe session cache & session history
  let latestSessionCache = {
    id: 'default',
    topic: 'Recent Swipes',
    timestamp: Date.now(),
    total: 0,
    kept: [],
    dismissed: [],
    later: []
  };
  let allSessionsCache = [];

  // Mention Autocomplete elements & state
  let mentionPopupEl = null;
  let isMentionPopupVisible = false;

  async function init() {
    createOverlay();
    createMentionPopup();
    initMentionListeners();
    initPromptSubmitInterceptor();
    observeChatStream();
    observePromptTools();

    // Load persisted settings & theme
    if (window.SwipeGPTStorage) {
      const settings = await window.SwipeGPTStorage.getSettings();
      if (settings?.theme) {
        applyTheme(settings.theme);
      }

      const sessions = await window.SwipeGPTStorage.getSessions();
      if (sessions && sessions.length > 0) {
        allSessionsCache = sessions;
        latestSessionCache = sessions[0];
      } else {
        const saved = await window.SwipeGPTStorage.getLatestSession();
        if (saved) {
          latestSessionCache = saved;
          allSessionsCache = [saved];
        }
      }
    }

    // Real-time theme synchronization from popup
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.swipegpt_settings?.newValue?.theme) {
          applyTheme(changes.swipegpt_settings.newValue.theme);
        }
      });
    }
  }

  function createOverlay() {
    if (document.getElementById('swipegpt-overlay')) return;

    overlayEl = document.createElement('div');
    overlayEl.id = 'swipegpt-overlay';
    overlayEl.className = 'swipegpt-overlay';

    overlayEl.innerHTML = `
      <div class="swipegpt-toast" id="swipegpt-toast">RECORD SAVED</div>

      <div class="crt-tv-cabinet">
        <!-- Top Bezel & Model Badge -->
        <div class="crt-tv-top-bezel">
          <div class="crt-tv-brand-tag">
            <span>■■</span> swiPTRON-90s <span>// RGB-PRO</span>
          </div>
          <div class="crt-tv-top-led" title="60Hz NTSC OK"></div>
        </div>

        <!-- CRT Screen Housing (Curved Glass Tube) -->
        <div class="crt-screen-housing">
          <div class="crt-flicker-layer"></div>
          <div class="crt-rolling-scanline"></div>
          <div class="crt-glass-reflection"></div>
          <div class="crt-vignette-layer"></div>

          <!-- On-Screen HUD -->
          <div class="crt-screen-hud">
            <div class="crt-hud-left">
              <span class="crt-channel-badge">AV-1</span>
              <span class="crt-signal-badge">● 60Hz</span>
            </div>
            <div class="crt-hud-title">■■ swiPT // FORCE OF WILL ■■</div>
            <div class="crt-hud-actions">
              <button class="crt-icon-btn crt-theme-btn" id="swipegpt-btn-theme-toggle" title="Switch Theme (CRT-90s / Modern Clean)">📺 CRT</button>
              <button class="crt-icon-btn" id="swipegpt-btn-undo" title="Rewind / Undo (Ctrl+Z)">↺ REW</button>
              <button class="crt-icon-btn" id="swipegpt-btn-close" title="Power Off (Esc)">✕ OFF</button>
            </div>
          </div>

          <!-- Swiping Stage -->
          <div class="swipegpt-stage">
            <div class="swipegpt-card-stack" id="swipegpt-card-stack"></div>
          </div>

          <!-- On-Screen Keyboard Hints -->
          <div class="crt-screen-footer">
            <span class="crt-key-hint"><kbd>◀</kbd> PURGE</span>
            <span class="crt-key-hint"><kbd>▶</kbd> KEEP</span>
            <span class="crt-key-hint"><kbd>▲</kbd> EXPAND</span>
            <span class="crt-key-hint"><kbd>▼</kbd> DEFER</span>
            <span class="crt-key-hint"><kbd>ESC</kbd> POWER</span>
          </div>

          <!-- Expand Detail Modal (Inside Screen) -->
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
        </div>

        <!-- Bottom TV Hardware Controls -->
        <div class="crt-tv-bottom-controls">
          <div class="crt-speaker-grille">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
          <div class="crt-tv-badge">swiPT-VISION</div>
          <div class="crt-tv-dials">
            <div class="crt-dial" title="Horizontal Sync"></div>
            <div class="crt-dial" title="Color Phosphor"></div>
            <div class="crt-power-led" title="Power On"></div>
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

    overlayEl.querySelector('#swipegpt-btn-theme-toggle')?.addEventListener('click', async () => {
      const nextTheme = currentTheme === 'modern' ? 'crt' : 'modern';
      applyTheme(nextTheme);
      const Storage = window.SwipeGPTStorage;
      if (Storage) {
        await Storage.saveSettings({ theme: nextTheme });
      }
      showToast(nextTheme === 'modern' ? '✨ Modern Clean theme' : '📺 Retro CRT-90s theme');
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

    // Apply active theme to newly created overlay
    applyTheme(currentTheme);
  }

  function applyTheme(theme) {
    currentTheme = theme || 'crt';
    const isModern = currentTheme === 'modern';

    if (overlayEl) {
      overlayEl.classList.toggle('theme-modern', isModern);
      const themeBtn = overlayEl.querySelector('#swipegpt-btn-theme-toggle');
      if (themeBtn) {
        themeBtn.textContent = isModern ? '✨ MODERN' : '📺 CRT';
        themeBtn.title = isModern ? 'Theme: Modern Clean (Click to switch to CRT-90s)' : 'Theme: Retro CRT-90s (Click to switch to Modern Clean)';
      }
      const hudTitle = overlayEl.querySelector('.crt-hud-title');
      if (hudTitle) {
        hudTitle.textContent = isModern ? 'swiPT · Decision Deck' : '■■ swiPT // FORCE OF WILL ■■';
      }
      const footerHints = overlayEl.querySelector('.crt-screen-footer');
      if (footerHints) {
        if (isModern) {
          footerHints.innerHTML = `
            <span class="crt-key-hint"><kbd>◀</kbd> Dismiss</span>
            <span class="crt-key-hint"><kbd>▶</kbd> Keep</span>
            <span class="crt-key-hint"><kbd>▲</kbd> Expand</span>
            <span class="crt-key-hint"><kbd>▼</kbd> Later</span>
            <span class="crt-key-hint"><kbd>ESC</kbd> Close</span>
          `;
        } else {
          footerHints.innerHTML = `
            <span class="crt-key-hint"><kbd>◀</kbd> PURGE</span>
            <span class="crt-key-hint"><kbd>▶</kbd> KEEP</span>
            <span class="crt-key-hint"><kbd>▲</kbd> EXPAND</span>
            <span class="crt-key-hint"><kbd>▼</kbd> DEFER</span>
            <span class="crt-key-hint"><kbd>ESC</kbd> POWER</span>
          `;
        }
      }
    }

    document.body.classList.toggle('swipt-theme-modern', isModern);

    if (mentionPopupEl) {
      mentionPopupEl.classList.toggle('theme-modern', isModern);
    }

    // Update all trigger buttons on page
    document.querySelectorAll('.swipegpt-trigger-btn').forEach(btn => {
      btn.classList.toggle('theme-modern', isModern);
      const labelSpan = btn.querySelector('span:not(.swipegpt-trigger-icon)');
      if (labelSpan) {
        labelSpan.textContent = isModern ? '[ 🎴 Swipe this answer ]' : '[ 🎴 SWIPE_THIS_ANSWER.EXE ]';
      }
      btn.title = isModern ? 'Transform this answer into swipe cards' : 'Transform this answer into retro CRT swipe cards';
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

  async function openOverlay(cards, topic = 'Card Session') {
    if (!overlayEl) createOverlay();

    // Lock body scrolling without altering layout
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    overlayEl.classList.add('active');

    const Storage = window.SwipeGPTStorage;
    const settings = Storage ? await Storage.getSettings() : {};
    applyTheme(settings?.theme || currentTheme);

    // Reset current active session for this swipe batch with topic
    latestSessionCache = {
      id: `session_${Date.now()}`,
      topic: topic,
      timestamp: Date.now(),
      total: cards.length,
      kept: [],
      dismissed: [],
      later: []
    };
    if (Storage) {
      await Storage.saveSession(latestSessionCache);
      allSessionsCache = await Storage.getSessions();
    }

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

        if (action === 'prompt_gpt') {
          closeOverlay();
          promptChatGPTWithSwiPT();
          return;
        }

        if (direction === 'right') {
          latestSessionCache.kept.push(card);
          if (Storage) {
            await Storage.saveCard(card);
            await Storage.saveSession(latestSessionCache);
            allSessionsCache = await Storage.getSessions();
          }
          showToast('✓ Saved to SwipeGPT');
        } else if (direction === 'left') {
          latestSessionCache.dismissed.push(card);
          if (Storage) {
            await Storage.incrementStat('cardsDismissed');
            await Storage.saveSession(latestSessionCache);
            allSessionsCache = await Storage.getSessions();
          }
        } else if (direction === 'down') {
          latestSessionCache.later.push(card);
          if (Storage) {
            await Storage.incrementStat('cardsLater');
            await Storage.saveSession(latestSessionCache);
            allSessionsCache = await Storage.getSessions();
          }
          showToast('⏱ Saved for later');
        } else if (direction === 'up') {
          latestSessionCache.kept.push(card);
          if (Storage) {
            await Storage.saveCard(card);
            await Storage.saveSession(latestSessionCache);
            allSessionsCache = await Storage.getSessions();
          }
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

  /* -------------------------------------------------------------
   * CHATGPT INPUT HELPERS & @swiPT CONTEXT
   * ----------------------------------------------------------- */

  function getPromptInput() {
    return document.querySelector('#prompt-textarea') ||
           document.querySelector('rich-textarea div[contenteditable="true"]') ||
           document.querySelector('rich-textarea [role="textbox"]') ||
           document.querySelector('div[role="textbox"][contenteditable="true"]') ||
           document.querySelector('.gemini-input-box [contenteditable="true"]') ||
           document.querySelector('textarea[data-id]') ||
           document.querySelector('div[contenteditable="true"]') ||
           document.querySelector('.chat-input-box textarea') ||
           document.querySelector('.chat-input-box [contenteditable="true"]');
  }

  function insertTextIntoPrompt(text, focus = true) {
    const input = getPromptInput();
    if (!input) return false;
    if (focus) input.focus();

    if (input.tagName === 'TEXTAREA') {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const val = input.value || '';
      input.value = val.substring(0, start) + text + val.substring(end);
      input.selectionStart = input.selectionEnd = start + text.length;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // Contenteditable (ChatGPT ProseMirror)
      const success = document.execCommand('insertText', false, text);
      if (!success) {
        const p = input.querySelector('p') || input;
        p.textContent = (p.textContent || '') + text;
        input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      }
    }
    return true;
  }

  function promptChatGPTWithSwiPT() {
    const defaultText = 'Pull the info from @swiPT and give me next steps.';
    insertTextIntoPrompt(defaultText, true);
    showToast('🎴 Added @swiPT to your message');
  }

  /* -------------------------------------------------------------
   * @swiPT AUTOCOMPLETE POPUP
   * ----------------------------------------------------------- */

  function createMentionPopup() {
    if (document.getElementById('swipt-mention-popup')) return;

    mentionPopupEl = document.createElement('div');
    mentionPopupEl.id = 'swipt-mention-popup';
    mentionPopupEl.className = 'swipt-mention-autocomplete';
    mentionPopupEl.style.display = 'none';

    mentionPopupEl.innerHTML = `
      <div class="swipt-mention-header">Available Skills & Mentions</div>
      <div class="swipt-mention-item active" id="swipt-mention-select-btn">
        <div class="swipt-mention-icon">🎴</div>
        <div class="swipt-mention-text">
          <div class="swipt-mention-title">
            <span>@swiPT</span>
            <span class="swipt-mention-badge" id="swipt-mention-badge">0 saved</span>
          </div>
          <div class="swipt-mention-subtitle" id="swipt-mention-sub">Pull chosen & dismissed cards from swipe session</div>
        </div>
      </div>
    `;

    document.body.appendChild(mentionPopupEl);

    mentionPopupEl.querySelector('#swipt-mention-select-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      confirmMentionAutocomplete();
    });
  }

  function showMentionPopup() {
    if (!mentionPopupEl) createMentionPopup();
    const input = getPromptInput();
    if (!input) return;

    const keptCount = latestSessionCache.kept?.length || 0;
    const badgeEl = mentionPopupEl.querySelector('#swipt-mention-badge');
    const subEl = mentionPopupEl.querySelector('#swipt-mention-sub');
    if (badgeEl) badgeEl.textContent = `${keptCount} chosen`;
    if (subEl) {
      if (keptCount > 0) {
        const titles = latestSessionCache.kept.slice(0, 2).map(c => c.title).join(', ');
        subEl.textContent = `Includes: ${titles}${keptCount > 2 ? '...' : ''}`;
      } else {
        subEl.textContent = `Pulls kept & dismissed cards from your swipe session`;
      }
    }

    const rect = input.getBoundingClientRect();
    mentionPopupEl.style.position = 'fixed';
    mentionPopupEl.style.left = `${Math.max(16, rect.left)}px`;
    mentionPopupEl.style.bottom = `${window.innerHeight - rect.top + 10}px`;
    mentionPopupEl.style.display = 'block';
    isMentionPopupVisible = true;
  }

  function hideMentionPopup() {
    if (mentionPopupEl) {
      mentionPopupEl.style.display = 'none';
      isMentionPopupVisible = false;
    }
  }

  function confirmMentionAutocomplete() {
    const input = getPromptInput();
    hideMentionPopup();
    if (!input) return;

    input.focus();
    if (input.tagName === 'TEXTAREA') {
      const val = input.value || '';
      const cursor = input.selectionStart || val.length;
      const beforeCursor = val.substring(0, cursor);
      const afterCursor = val.substring(cursor);
      // Replace trailing @ or @swi... with @swiPT 
      const replaced = beforeCursor.replace(/@\w*$/, '@swiPT ');
      input.value = replaced + afterCursor;
      input.selectionStart = input.selectionEnd = replaced.length;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // Contenteditable
      const text = input.innerText || input.textContent || '';
      if (/@\w*$/.test(text)) {
        document.execCommand('delete', false);
      }
      insertTextIntoPrompt('@swiPT ', true);
    }
  }

  function initMentionListeners() {
    document.addEventListener('input', (e) => {
      const input = getPromptInput();
      if (!input || (e.target !== input && !input.contains(e.target))) return;

      const text = input.tagName === 'TEXTAREA' ? (input.value || '') : (input.innerText || input.textContent || '');
      // Match if user typed '@' or '@swi...'
      if (/(?:^|\s)@(s|sw|swi|swip|swipt)?$/i.test(text.trimEnd())) {
        showMentionPopup();
      } else {
        hideMentionPopup();
      }
    });

    document.addEventListener('click', (e) => {
      if (mentionPopupEl && !mentionPopupEl.contains(e.target)) {
        hideMentionPopup();
      }
    });
  }

  /* -------------------------------------------------------------
   * PROMPT SUBMISSION INTERCEPTOR (@swiPT -> Context Expansion)
   * ----------------------------------------------------------- */

  function initPromptSubmitInterceptor() {
    // Intercept Enter keydown
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        if (isMentionPopupVisible) {
          e.preventDefault();
          e.stopPropagation();
          confirmMentionAutocomplete();
          return;
        }
        handlePromptSubmit();
      } else if (e.key === 'Tab' && isMentionPopupVisible) {
        e.preventDefault();
        e.stopPropagation();
        confirmMentionAutocomplete();
      } else if (e.key === 'Escape' && isMentionPopupVisible) {
        hideMentionPopup();
      }
    }, true);

    // Intercept Send button click
    document.addEventListener('click', (e) => {
      const sendBtn = e.target.closest(
        'button[data-testid="send-button"], button[aria-label="Send prompt"], button[data-testid="fruitjuice-send-button"], #send-button, .chat-input-box span:last-child, button[data-testid="composer-speech-button"] + button, button[aria-label*="Send message"], button[aria-label*="Submit"], button.send-button, .send-button-container button, .btn-send-gemini'
      );
      if (sendBtn) {
        handlePromptSubmit();
      }
    }, true);
  }

  function handlePromptSubmit() {
    const input = getPromptInput();
    if (!input) return;

    const text = input.tagName === 'TEXTAREA' ? (input.value || '') : (input.innerText || input.textContent || '');

    // Check if the prompt includes @swiPT and isn't already expanded
    if (/@swipt\b/i.test(text) && !text.includes('[Context from @swiPT')) {
      const Storage = window.SwipeGPTStorage;
      let session = latestSessionCache;
      if (Storage && typeof Storage.findMatchingSession === 'function') {
        session = Storage.findMatchingSession(text, allSessionsCache) || latestSessionCache;
      }
      let contextBlock = '';

      if (session && ((session.kept && session.kept.length > 0) || (session.dismissed && session.dismissed.length > 0))) {
        const topicName = session.topic ? `"${session.topic}"` : 'Recent Session';
        contextBlock = `\n\n[Context from @swiPT (Matched Session: ${topicName})]:\n`;
        if (session.kept && session.kept.length > 0) {
          contextBlock += `• Selected / Kept (${session.kept.length}):\n`;
          session.kept.forEach((item, i) => {
            const detail = item.plainText ? ` - ${item.plainText.substring(0, 140)}` : '';
            contextBlock += `  ${i + 1}. ${item.title}${detail}\n`;
          });
        }
        if (session.dismissed && session.dismissed.length > 0) {
          contextBlock += `• Dismissed / Skipped (${session.dismissed.length}):\n`;
          session.dismissed.forEach((item, i) => {
            contextBlock += `  - ${item.title}\n`;
          });
        }
        contextBlock = contextBlock.trim();
      } else {
        contextBlock = `[Context from @swiPT]: No active card selections recorded in this session.`;
      }

      // Inject the context synchronously before native submission executes
      if (input.tagName === 'TEXTAREA') {
        input.value = text + '\n\n' + contextBlock;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        input.focus();
        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          range.selectNodeContents(input);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        document.execCommand('insertText', false, '\n\n' + contextBlock);
        input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '\n\n' + contextBlock }));
      }
    }
  }

  /* -------------------------------------------------------------
   * '+' MENU INJECTION (NO PERMANENT CHAT BAR BUTTON)
   * ----------------------------------------------------------- */

  function observePromptTools() {
    // Remove any permanent toolbar button if present
    const legacyBtn = document.getElementById('swipt-quick-attach-btn');
    if (legacyBtn) legacyBtn.remove();

    const observer = new MutationObserver(() => {
      const b = document.getElementById('swipt-quick-attach-btn');
      if (b) b.remove();
      injectPlusMenuItem();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    injectPlusMenuItem();
  }

  function injectPlusMenuItem() {
    // Check if ChatGPT's '+' menu popover is open
    const menu = document.querySelector(
      '[role="menu"], mat-menu-panel, .mat-mdc-menu-panel, [data-radix-popper-content-wrapper] [role="menu"], .chatgpt-plus-menu, .gemini-plus-menu'
    );
    if (!menu || menu.querySelector('#swipt-menu-item')) return;

    const menuItem = document.createElement('div');
    menuItem.id = 'swipt-menu-item';
    menuItem.className = 'swipt-menu-item';
    menuItem.setAttribute('role', 'menuitem');
    menuItem.setAttribute('tabindex', '-1');

    const count = latestSessionCache.kept?.length || 0;
    menuItem.innerHTML = `
      <div class="swipt-menu-item-icon">🎴</div>
      <div class="swipt-menu-item-content">
        <div class="swipt-menu-item-title">@swiPT Context</div>
        <div class="swipt-menu-item-desc">Attach chosen & dismissed cards (${count} kept)</div>
      </div>
    `;

    menuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      insertTextIntoPrompt('@swiPT ', true);
      showToast('🎴 Inserted @swiPT mention');
      // Click outside to dismiss menu
      document.body.click();
    });

    menu.appendChild(menuItem);
  }

  /* -------------------------------------------------------------
   * CHAT STREAM OBSERVER & TRIGGER BUTTON INJECTION
   * ----------------------------------------------------------- */

  function observeChatStream() {
    const observer = new MutationObserver(() => {
      if (scanDebounceTimer) clearTimeout(scanDebounceTimer);
      scanDebounceTimer = setTimeout(scanAndInjectButtons, 180);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    scanAndInjectButtons();
  }

  function scanAndInjectButtons() {
    const hasActiveStopButton = document.querySelector(
      'button[data-testid="stop-button"], button[aria-label="Stop generating"], button[aria-label*="Stop response"], mat-progress-bar, .result-streaming, .streaming, [aria-label*="Thinking"]'
    );

    const assistantTurns = document.querySelectorAll(
      '[data-message-author-role="assistant"], article[data-testid^="conversation-turn-"]:has([data-message-author-role="assistant"]), div.agent-turn, .chatgpt-mock-assistant-turn, model-response, .model-response, .response-container, .gemini-mock-model-turn, div[aria-label="Model response"]'
    );

    assistantTurns.forEach((turn, idx) => {
      const markdownContainer = turn.querySelector('.markdown, .prose, [class*="prose"], .turn-content, .message-content, .model-response-text, message-content') || turn;
      if (!markdownContainer) return;

      if (turn.querySelector('.swipegpt-trigger-container') || markdownContainer.querySelector('.swipegpt-trigger-container')) {
        return;
      }

      const isTurnStreaming = turn.querySelector('.result-streaming, [class*="streaming"], mat-progress-bar') ||
        (hasActiveStopButton && idx === assistantTurns.length - 1);

      if (isTurnStreaming) return;

      // Only inject for messages containing actual lists (ol, ul with >= 2 items) or comparison tables
      const hasActualList =
        markdownContainer.querySelector('ol > li:nth-child(2)') ||
        markdownContainer.querySelector('ul > li:nth-child(2)') ||
        markdownContainer.querySelector('table tbody tr:nth-child(2)');

      if (!hasActualList) return;

      // Verify the parser can genuinely extract 2 or more cards before injecting
      const candidateCards = window.SwipeGPTCardParser?.parse(markdownContainer);
      if (!candidateCards || candidateCards.length < 2) return;

      const isModern = currentTheme === 'modern';
      const triggerWrap = document.createElement('div');
      triggerWrap.className = 'swipegpt-trigger-container';
      triggerWrap.innerHTML = `
        <button class="swipegpt-trigger-btn ${isModern ? 'theme-modern' : ''}" type="button" title="${isModern ? 'Transform this answer into swipe cards' : 'Transform this answer into retro CRT swipe cards'}">
          <span class="swipegpt-trigger-icon">🎴</span>
          <span>${isModern ? '[ 🎴 Swipe this answer ]' : '[ 🎴 SWIPE_THIS_ANSWER.EXE ]'}</span>
        </button>
      `;

      triggerWrap.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        const cards = candidateCards || window.SwipeGPTCardParser?.parse(markdownContainer);
        if (cards && cards.length >= 2) {
          // Detect topic title from user message or heading (ChatGPT & Gemini)
          let topic = '';
          const userBubble = turn.previousElementSibling?.querySelector?.('.turn-user-bubble, .user-query, .query-content') ||
            (turn.previousElementSibling?.matches?.('.turn-user, user-query, .user-query') ? turn.previousElementSibling : null) ||
            turn.closest('article, model-response')?.previousElementSibling?.querySelector?.('[data-message-author-role="user"], user-query, .user-query, div[aria-label="User query"]');
          if (userBubble) {
            topic = (userBubble.innerText || userBubble.textContent || '').trim();
          }
          if (!topic) {
            const h = markdownContainer.querySelector('h1, h2, h3, h4, p strong');
            topic = h ? h.textContent.trim() : (cards[0]?.title || 'Card Session');
          }
          if (topic.length > 55) topic = topic.substring(0, 55) + '...';

          openOverlay(cards, topic);
        } else {
          showToast('No separable list items found in this answer');
        }
      });

      markdownContainer.appendChild(triggerWrap);
    });
  }

  // Expose methods for testing and initialization
  window.SwipeGPTContent = {
    openOverlay,
    closeOverlay,
    scanAndInjectButtons,
    promptChatGPTWithSwiPT,
    insertTextIntoPrompt,
    getLatestSession: () => latestSessionCache
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
