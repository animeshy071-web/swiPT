/**
 * SwipeGPT - Popup Dashboard Controller (Phase 4 & 5)
 */

const Storage = window.SwipeGPTStorage || (typeof StorageService !== 'undefined' ? StorageService : null);

let cachedSavedCards = [];

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  await loadStats();
  await loadSavedCards();
  await loadSettings();
  bindActions();
  setupStorageListener();
});

function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetId = `tab-${tab.dataset.tab}`;
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  document.getElementById('btn-view-all-saved')?.addEventListener('click', () => {
    document.querySelector('[data-tab="saved"]')?.click();
  });
}

async function loadStats() {
  if (!Storage) return;
  const stats = await Storage.getStats();
  document.getElementById('stat-viewed').textContent = stats.cardsViewed || 0;
  document.getElementById('stat-saved').textContent = stats.cardsSaved || 0;
  document.getElementById('stat-dismissed').textContent = stats.cardsDismissed || 0;
  document.getElementById('stat-later').textContent = stats.cardsLater || 0;
}

async function loadSavedCards() {
  if (!Storage) return;
  cachedSavedCards = await Storage.getSavedCards();
  renderSavedCards(cachedSavedCards);
}

function renderSavedCards(cards) {
  const previewList = document.getElementById('preview-list');
  const fullList = document.getElementById('saved-cards-full-list');
  const countBadge = document.getElementById('saved-total-count');

  if (countBadge) {
    countBadge.textContent = `${cards.length} SAVED RECORDS`;
  }

  if (cards.length === 0) {
    const emptyHtml = `<div class="empty-state">NO SAVED RECORDS. SWIPE RIGHT [KEEP] ON LISTS TO SAVE!</div>`;
    if (previewList) previewList.innerHTML = emptyHtml;
    if (fullList) fullList.innerHTML = emptyHtml;
    return;
  }

  // Populate preview list (first 3)
  if (previewList) {
    previewList.innerHTML = '';
    cards.slice(0, 3).forEach(card => {
      previewList.appendChild(createCardRow(card, false));
    });
  }

  // Populate full list
  if (fullList) {
    fullList.innerHTML = '';
    cards.forEach(card => {
      fullList.appendChild(createCardRow(card, true));
    });
  }
}

function createCardRow(card, isFull) {
  const item = document.createElement('div');
  item.className = 'saved-card-item';

  const badgeHtml = card.badge ? `<span style="font-size: 10px; opacity: 0.8; margin-right: 6px; padding: 2px 5px; background: rgba(99,102,241,0.2); border-radius: 4px;">${escapeHtml(card.badge)}</span>` : '';

  item.innerHTML = `
    <div style="display: flex; align-items: center; overflow: hidden; gap: 4px;">
      ${badgeHtml}
      <span class="saved-item-title" title="${escapeHtml(card.title)}">${escapeHtml(card.title)}</span>
    </div>
    <div class="saved-item-actions">
      <button class="btn-mini-action btn-copy" title="Copy text">📋</button>
      ${isFull ? `<button class="btn-mini-action btn-del" title="Delete">✕</button>` : ''}
    </div>
  `;

  item.querySelector('.btn-copy').addEventListener('click', async () => {
    const textToCopy = `${card.title}\n\n${card.plainText || ''}`;
    await navigator.clipboard.writeText(textToCopy);
    const copyBtn = item.querySelector('.btn-copy');
    copyBtn.textContent = '✓';
    setTimeout(() => { copyBtn.textContent = '📋'; }, 1200);
  });

  if (isFull) {
    item.querySelector('.btn-del').addEventListener('click', async () => {
      await Storage.removeCard(card.id);
      await loadSavedCards();
      await loadStats();
    });
  }

  return item;
}

function applyPopupTheme(theme) {
  const isModern = theme === 'modern';
  document.body.classList.toggle('theme-modern', isModern);
  const quickToggle = document.getElementById('btn-quick-theme');
  if (quickToggle) {
    quickToggle.textContent = isModern ? 'MODERN' : 'CRT-90s';
  }
  const themeSelect = document.getElementById('setting-theme');
  if (themeSelect && themeSelect.value !== theme) {
    themeSelect.value = theme;
  }
}

async function loadSettings() {
  if (!Storage) return;
  const settings = await Storage.getSettings();
  const animCheckbox = document.getElementById('setting-animations');
  const shortCheckbox = document.getElementById('setting-shortcuts');
  const densitySelect = document.getElementById('setting-density');
  const thresholdBadge = document.getElementById('badge-threshold');
  const themeSelect = document.getElementById('setting-theme');
  const quickToggle = document.getElementById('btn-quick-theme');
  const currentTheme = settings.theme || 'crt';

  applyPopupTheme(currentTheme);

  if (themeSelect) {
    themeSelect.value = currentTheme;
    themeSelect.addEventListener('change', async (e) => {
      settings.theme = e.target.value;
      await Storage.saveSettings(settings);
      applyPopupTheme(settings.theme);
    });
  }

  quickToggle?.addEventListener('click', async () => {
    const nextTheme = (settings.theme === 'modern') ? 'crt' : 'modern';
    settings.theme = nextTheme;
    await Storage.saveSettings(settings);
    applyPopupTheme(nextTheme);
  });

  if (animCheckbox) animCheckbox.checked = settings.animationsEnabled;
  if (shortCheckbox) shortCheckbox.checked = settings.keyboardShortcuts;
  if (densitySelect) densitySelect.value = settings.cardDensity || 'comfortable';
  if (thresholdBadge) thresholdBadge.textContent = `${Math.round((settings.swipeThreshold || 0.35) * 100)}%`;

  animCheckbox?.addEventListener('change', async (e) => {
    settings.animationsEnabled = e.target.checked;
    await Storage.saveSettings(settings);
  });

  shortCheckbox?.addEventListener('change', async (e) => {
    settings.keyboardShortcuts = e.target.checked;
    await Storage.saveSettings(settings);
  });

  densitySelect?.addEventListener('change', async (e) => {
    settings.cardDensity = e.target.value;
    await Storage.saveSettings(settings);
  });
}

function bindActions() {
  // Clear all
  document.getElementById('btn-clear-all')?.addEventListener('click', async () => {
    if (confirm('Clear all saved cards from SwipeGPT?')) {
      await Storage.clearAllCards();
      await loadSavedCards();
      await loadStats();
    }
  });

  // Reset stats
  document.getElementById('btn-reset-stats')?.addEventListener('click', async () => {
    if (confirm('Reset all counters back to zero?')) {
      await Storage.resetStats();
      await loadStats();
    }
  });

  // Search filter
  const searchInput = document.getElementById('saved-search-input');
  searchInput?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderSavedCards(cachedSavedCards);
      return;
    }
    const filtered = cachedSavedCards.filter(c => 
      (c.title || '').toLowerCase().includes(query) ||
      (c.plainText || '').toLowerCase().includes(query) ||
      (c.badge || '').toLowerCase().includes(query)
    );
    renderSavedCards(filtered);
  });

  // Export Markdown
  document.getElementById('btn-export-markdown')?.addEventListener('click', async () => {
    const cards = await Storage.getSavedCards();
    const md = Storage.exportCardsAsMarkdown(cards);
    
    // Download or copy to clipboard
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swipegpt-saved-cards-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function setupStorageListener() {
  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        if (changes.swipegpt_cards) loadSavedCards();
        if (changes.swipegpt_stats) loadStats();
      }
    });
  }
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
