/**
 * SwipeGPT - Storage Management (Phase 4 & 5 Polish)
 * Handles chrome.storage.local persistence for saved cards, swipe history, undo stack, and settings.
 */

const STORAGE_KEYS = {
  CARDS: 'swipegpt_cards',
  HISTORY: 'swipegpt_history',
  STATS: 'swipegpt_stats',
  SETTINGS: 'swipegpt_settings'
};

const DEFAULT_SETTINGS = {
  animationsEnabled: true,
  swipeThreshold: 0.35,
  theme: 'dark',
  keyboardShortcuts: true,
  cardDensity: 'comfortable'
};

const DEFAULT_STATS = {
  cardsViewed: 0,
  cardsSaved: 0,
  cardsDismissed: 0,
  cardsLater: 0
};

const StorageService = {
  async getSettings() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      const mock = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return mock ? { ...DEFAULT_SETTINGS, ...JSON.parse(mock) } : DEFAULT_SETTINGS;
    }
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.SETTINGS] || {}) };
  },

  async saveSettings(settings) {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return;
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
  },

  async getSavedCards() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      const mock = localStorage.getItem(STORAGE_KEYS.CARDS);
      return mock ? JSON.parse(mock) : [];
    }
    const result = await chrome.storage.local.get(STORAGE_KEYS.CARDS);
    return result[STORAGE_KEYS.CARDS] || [];
  },

  async saveCard(card) {
    const cards = await this.getSavedCards();
    const existingIndex = cards.findIndex(c => c.id === card.id);
    if (existingIndex >= 0) {
      cards[existingIndex] = { ...card, updatedAt: Date.now() };
    } else {
      cards.unshift({ ...card, savedAt: Date.now() });
    }

    if (typeof chrome === 'undefined' || !chrome.storage) {
      localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
    } else {
      await chrome.storage.local.set({ [STORAGE_KEYS.CARDS]: cards });
    }
    await this.incrementStat('cardsSaved');
    return cards;
  },

  async removeCard(cardId) {
    const cards = await this.getSavedCards();
    const filtered = cards.filter(c => c.id !== cardId);
    if (typeof chrome === 'undefined' || !chrome.storage) {
      localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(filtered));
    } else {
      await chrome.storage.local.set({ [STORAGE_KEYS.CARDS]: filtered });
    }
    return filtered;
  },

  async clearAllCards() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify([]));
    } else {
      await chrome.storage.local.set({ [STORAGE_KEYS.CARDS]: [] });
    }
    return [];
  },

  async getStats() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      const mock = localStorage.getItem(STORAGE_KEYS.STATS);
      return mock ? { ...DEFAULT_STATS, ...JSON.parse(mock) } : DEFAULT_STATS;
    }
    const result = await chrome.storage.local.get(STORAGE_KEYS.STATS);
    return { ...DEFAULT_STATS, ...(result[STORAGE_KEYS.STATS] || {}) };
  },

  async incrementStat(key) {
    const stats = await this.getStats();
    if (key in stats) {
      stats[key] += 1;
      if (typeof chrome === 'undefined' || !chrome.storage) {
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
      } else {
        await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: stats });
      }
    }
    return stats;
  },

  async decrementStat(key) {
    const stats = await this.getStats();
    if (key in stats && stats[key] > 0) {
      stats[key] -= 1;
      if (typeof chrome === 'undefined' || !chrome.storage) {
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
      } else {
        await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: stats });
      }
    }
    return stats;
  },

  async resetStats() {
    const fresh = { ...DEFAULT_STATS };
    if (typeof chrome === 'undefined' || !chrome.storage) {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(fresh));
    } else {
      await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: fresh });
    }
    return fresh;
  },

  async recordSwipeHistory(entry) {
    let history = [];
    if (typeof chrome === 'undefined' || !chrome.storage) {
      const mock = localStorage.getItem(STORAGE_KEYS.HISTORY);
      history = mock ? JSON.parse(mock) : [];
    } else {
      const res = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
      history = res[STORAGE_KEYS.HISTORY] || [];
    }

    history.push({ ...entry, timestamp: Date.now() });
    if (history.length > 50) history.shift();

    if (typeof chrome === 'undefined' || !chrome.storage) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } else {
      await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
    }
  },

  async undoLastHistory() {
    let history = [];
    if (typeof chrome === 'undefined' || !chrome.storage) {
      const mock = localStorage.getItem(STORAGE_KEYS.HISTORY);
      history = mock ? JSON.parse(mock) : [];
    } else {
      const res = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
      history = res[STORAGE_KEYS.HISTORY] || [];
    }

    if (history.length === 0) return null;
    const last = history.pop();

    if (typeof chrome === 'undefined' || !chrome.storage) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } else {
      await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
    }

    // Revert stat & saved card if needed
    if (last.direction === 'right' && last.card?.id) {
      await this.removeCard(last.card.id);
      await this.decrementStat('cardsSaved');
    } else if (last.direction === 'left') {
      await this.decrementStat('cardsDismissed');
    } else if (last.direction === 'down') {
      await this.decrementStat('cardsLater');
    }
    await this.decrementStat('cardsViewed');

    return last;
  },

  exportCardsAsMarkdown(cards) {
    if (!cards || cards.length === 0) return '# No saved cards in SwipeGPT';
    let md = `# SwipeGPT Saved Cards Export\nGenerated: ${new Date().toLocaleString()}\n\n`;
    cards.forEach((c, idx) => {
      md += `## ${idx + 1}. ${c.title}\n`;
      if (c.badge) md += `**Category / Badge:** ${c.badge}\n\n`;
      md += `${c.plainText || c.content}\n\n---\n\n`;
    });
    return md;
  }
};

// Global fallback for content scripts and popup
if (typeof window !== 'undefined') {
  window.SwipeGPTStorage = StorageService;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageService;
}
