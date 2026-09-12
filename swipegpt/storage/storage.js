/**
 * SwipeGPT - Storage Management (Phase 4 & 5 Polish)
 * Handles chrome.storage.local persistence for saved cards, swipe history, undo stack, and settings.
 */

const STORAGE_KEYS = {
  CARDS: 'swipegpt_cards',
  HISTORY: 'swipegpt_history',
  STATS: 'swipegpt_stats',
  SETTINGS: 'swipegpt_settings',
  LATEST_SESSION: 'swipegpt_latest_session',
  SESSIONS: 'swipegpt_sessions'
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

  async getSessions() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      const mock = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return mock ? JSON.parse(mock) : [];
    }
    const result = await chrome.storage.local.get(STORAGE_KEYS.SESSIONS);
    return result[STORAGE_KEYS.SESSIONS] || [];
  },

  async saveSession(session) {
    const sessions = await this.getSessions();
    const id = session.id || `session_${Date.now()}`;
    const cleanSession = { ...session, id, updatedAt: Date.now() };

    const idx = sessions.findIndex(s => s.id === id);
    if (idx >= 0) {
      sessions[idx] = cleanSession;
    } else {
      sessions.unshift(cleanSession);
    }

    // Keep up to 15 recent sessions
    const trimmed = sessions.slice(0, 15);

    if (typeof chrome === 'undefined' || !chrome.storage) {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(trimmed));
      localStorage.setItem(STORAGE_KEYS.LATEST_SESSION, JSON.stringify(cleanSession));
    } else {
      await chrome.storage.local.set({
        [STORAGE_KEYS.SESSIONS]: trimmed,
        [STORAGE_KEYS.LATEST_SESSION]: cleanSession
      });
    }
    return cleanSession;
  },

  async getLatestSession() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      const mock = localStorage.getItem(STORAGE_KEYS.LATEST_SESSION);
      return mock ? JSON.parse(mock) : null;
    }
    const result = await chrome.storage.local.get(STORAGE_KEYS.LATEST_SESSION);
    return result[STORAGE_KEYS.LATEST_SESSION] || null;
  },

  async setLatestSession(session) {
    return this.saveSession(session);
  },

  /**
   * Smart Keyword Matcher (Solution 3):
   * Inspects prompt text for keywords to identify if the user is referring to a specific past session
   * (e.g., "pull the saas ideas from @swiPT" vs "compare the typescript ones").
   */
  findMatchingSession(queryText = '', sessions = []) {
    if (!sessions || sessions.length === 0) return null;
    if (!queryText || !queryText.trim()) return sessions[0];

    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'from',
      'is', 'it', 'this', 'that', 'these', 'those', 'my', 'me', 'we', 'our', 'you', 'your',
      'pull', 'get', 'fetch', 'show', 'give', 'tell', 'use', 'take', 'using', 'based',
      'info', 'information', 'data', 'cards', 'options', 'selections', 'session', 'swipt',
      'please', 'can', 'could', 'would', 'suggest', 'compare', 'review', 'next', 'steps',
      'ye', 'yeh', 'vo', 'voh', 'wale', 'wala', 'wali', 'se', 'jo', 'tb', 'tab', 'bola',
      'tha', 'thi', 'the', 'chahiye', 'karo', 'kar', 'do', 'hona', 'pehle', 'kaunsa'
    ]);

    const cleanTokens = queryText
      .toLowerCase()
      .replace(/[@#.,!?:;()[\]{}'"`/\\-]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 3 && !stopWords.has(t));

    if (cleanTokens.length === 0) return sessions[0];

    let bestSession = sessions[0];
    let maxScore = 0;

    for (const session of sessions) {
      let score = 0;
      const topicLower = (session.topic || '').toLowerCase();

      for (const token of cleanTokens) {
        // Topic title match (highest confidence)
        if (topicLower.includes(token)) score += 15;

        // Card titles match (high confidence)
        if (session.kept && Array.isArray(session.kept)) {
          for (const card of session.kept) {
            const titleLower = (card.title || '').toLowerCase();
            const textLower = (card.plainText || '').toLowerCase();
            if (titleLower.includes(token)) score += 8;
            else if (textLower.includes(token)) score += 3;
          }
        }

        // Dismissed cards match
        if (session.dismissed && Array.isArray(session.dismissed)) {
          for (const card of session.dismissed) {
            const titleLower = (card.title || '').toLowerCase();
            if (titleLower.includes(token)) score += 5;
          }
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestSession = session;
      }
    }

    return bestSession;
  },

  async formatContextForGPT(queryText = '') {
    const sessions = await this.getSessions();
    const session = this.findMatchingSession(queryText, sessions);
    const savedCards = await this.getSavedCards();

    // If we have an active or matched session with kept or dismissed items
    if (session && ((session.kept && session.kept.length > 0) || (session.dismissed && session.dismissed.length > 0))) {
      const topicName = session.topic ? `"${session.topic}"` : 'Recent Session';
      let output = `[Context from @swiPT (Session: ${topicName})]:\n`;
      if (session.kept && session.kept.length > 0) {
        output += `• Selected / Kept (${session.kept.length}):\n`;
        session.kept.forEach((item, i) => {
          const detail = item.plainText ? ` - ${item.plainText.substring(0, 120)}` : '';
          output += `  ${i + 1}. ${item.title}${detail}\n`;
        });
      }
      if (session.dismissed && session.dismissed.length > 0) {
        output += `• Dismissed / Skipped (${session.dismissed.length}):\n`;
        session.dismissed.forEach((item, i) => {
          output += `  - ${item.title}\n`;
        });
      }
      return output.trim();
    }

    // Fallback to recent saved cards
    if (savedCards && savedCards.length > 0) {
      const recent = savedCards.slice(0, 5);
      let output = `[Context from @swiPT saved cards]:\n• Saved items (${recent.length}):\n`;
      recent.forEach((item, i) => {
        const detail = item.plainText ? ` - ${item.plainText.substring(0, 120)}` : '';
        output += `  ${i + 1}. ${item.title}${detail}\n`;
      });
      return output.trim();
    }

    return `[Context from @swiPT]: (No saved card selections found yet. Swipe cards on an answer above to choose options.)`;
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
