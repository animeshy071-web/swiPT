/**
 * SwipeGPT - Deterministic Card Parser (Phase 3)
 * Converts raw ChatGPT rendered HTML/Markdown into normalized Card objects.
 * Implements an extensible multi-strategy pipeline with semantic type detection.
 */

const CardParser = {
  strategies: [],

  /**
   * Main parsing entry point
   * @param {HTMLElement|string} contentElement
   * @param {string} [sourceMessageId]
   * @returns {Array<Object>|null} Normalized Card objects or null if unparseable
   */
  parse(contentElement, sourceMessageId = '') {
    if (!contentElement) return null;

    const el = typeof contentElement === 'string'
      ? (() => {
          if (typeof document !== 'undefined') {
            const div = document.createElement('div');
            div.innerHTML = contentElement;
            return div;
          }
          return null;
        })()
      : contentElement;

    if (!el) return null;

    // Execute registered parsing strategies in priority order
    for (const strat of this.strategies) {
      try {
        const cards = strat.fn.call(this, el, sourceMessageId);
        if (cards && Array.isArray(cards) && cards.length >= 2) {
          // Normalize and enrich each card
          return cards.map((c, i) => this.normalizeCard(c, i, cards.length, sourceMessageId));
        }
      } catch (err) {
        console.warn(`[SwipeGPT Parser] Strategy '${strat.name}' failed:`, err);
      }
    }

    return null;
  },

  /**
   * Register an extensible parsing strategy
   */
  registerStrategy(name, priority, fn) {
    this.strategies.push({ name, priority, fn });
    this.strategies.sort((a, b) => b.priority - a.priority);
  },

  /**
   * Normalizes schema to match TRD specifications
   */
  normalizeCard(card, index, total, sourceMessageId) {
    const plain = (card.plainText || card.content || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Check semantic type from title and content
    const detectedType = this.detectCardType(card.title, plain);
    let cardType = (card.type && card.type !== 'list' && card.type !== 'points')
      ? card.type
      : detectedType;

    return {
      id: card.id || this.generateUUID(),
      index: index + 1,
      total: total,
      title: this.cleanTitle(card.title || `Item ${index + 1}`),
      content: card.content || `<p>${plain}</p>`,
      plainText: plain,
      type: cardType,
      badge: card.badge || this.getBadgeForType(cardType, card.title),
      sourceMessageId: sourceMessageId || card.sourceMessageId || '',
      createdAt: card.createdAt || Date.now(),
      status: card.status || 'pending'
    };
  },

  detectCardType(title = '', text = '') {
    const combined = `${title} ${text}`.toLowerCase();

    if (/\b(pro|cons?|advantage|disadvantage|upside|downside|benefit|drawback)\b/.test(combined)) {
      return 'pros-cons';
    }
    if (/\b(step\s*\d+|phase\s*\d+|stage\s*\d+|how\s+to|\bguide\b)\b/.test(combined)) {
      return 'steps';
    }
    if (/\b(\$|pricing|price|tier|rating|tool|product|subscription)\b/.test(combined)) {
      return 'product';
    }
    return 'list';
  },

  getBadgeForType(type, title = '') {
    const lower = title.toLowerCase();
    if (type === 'pros-cons') {
      if (/\b(pro|advantage|upside|benefit)\b/.test(lower)) return 'Advantage';
      if (/\b(con|disadvantage|downside|drawback)\b/.test(lower)) return 'Disadvantage';
      return 'Review';
    }
    if (type === 'steps') return 'Step';
    if (type === 'product') return 'Tool';
    return 'List Item';
  },

  cleanTitle(title) {
    return title
      .replace(/^\d+[\.\)\-]\s*/, '') // Remove leading numbers: "1. ", "2) "
      .replace(/^[-•*]\s*/, '')       // Remove leading bullets
      .replace(/[:.-]+$/, '')         // Remove trailing punctuation
      .trim();
  },

  generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'card-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  // --- STRATEGY 1: Ordered Lists (<ol> > <li>) ---
  parseOrderedList(container, sourceMessageId) {
    const items = Array.from(container.querySelectorAll('ol > li'));
    if (items.length < 2) return null;

    return items.map((li, index) => {
      const strong = li.querySelector('strong, b');
      let title = '';
      let contentHtml = li.innerHTML;

      if (strong && strong.textContent.trim().length > 0) {
        title = strong.textContent.trim();
      } else {
        const text = li.textContent.trim();
        const firstSentence = text.split(/[.\n]/)[0] || '';
        title = firstSentence.length <= 60 ? firstSentence : `Step ${index + 1}`;
      }

      return {
        id: this.generateUUID(),
        title: title,
        content: contentHtml,
        plainText: li.textContent.trim(),
        type: 'steps',
        sourceMessageId
      };
    });
  },

  // --- STRATEGY 2: Unordered Lists (<ul> > <li>) ---
  parseUnorderedList(container, sourceMessageId) {
    const items = Array.from(container.querySelectorAll('ul > li'));
    if (items.length < 2) return null;

    return items.map((li, index) => {
      const strong = li.querySelector('strong, b');
      let title = '';
      let contentHtml = li.innerHTML;

      if (strong && strong.textContent.trim().length > 0) {
        title = strong.textContent.trim();
      } else {
        const text = li.textContent.trim();
        const firstSegment = text.split(/[:\n]/)[0] || '';
        title = firstSegment.length <= 60 ? firstSegment : `Item ${index + 1}`;
      }

      return {
        id: this.generateUUID(),
        title: title,
        content: contentHtml,
        plainText: li.textContent.trim(),
        type: 'list',
        sourceMessageId
      };
    });
  },

  // --- STRATEGY 3: Headings (h2, h3, h4) followed by section siblings ---
  parseHeadings(container, sourceMessageId) {
    const headings = Array.from(container.querySelectorAll('h2, h3, h4'));
    if (headings.length < 2) return null;

    const cards = [];
    headings.forEach((heading, index) => {
      const title = heading.textContent.trim();
      let contentHtml = '';
      let plainText = '';
      let nextNode = heading.nextElementSibling;

      while (nextNode && !['H2', 'H3', 'H4'].includes(nextNode.tagName) && !nextNode.classList?.contains('swipegpt-trigger-container')) {
        contentHtml += nextNode.outerHTML;
        plainText += ' ' + nextNode.textContent.trim();
        nextNode = nextNode.nextElementSibling;
      }

      if (contentHtml.trim() || title) {
        cards.push({
          id: this.generateUUID(),
          title: title,
          content: contentHtml || `<p>${title}</p>`,
          plainText: plainText.trim() || title,
          type: 'section',
          sourceMessageId
        });
      }
    });

    return cards.length >= 2 ? cards : null;
  },

  // --- STRATEGY 4: Bold Lead-in Paragraphs ---
  parseBoldParagraphs(container, sourceMessageId) {
    const paragraphs = Array.from(container.querySelectorAll('p'));
    const cards = [];

    paragraphs.forEach((p, index) => {
      const strong = p.querySelector('strong, b');
      if (strong && p.textContent.trim().startsWith(strong.textContent.trim())) {
        const title = strong.textContent.trim();
        if (title.length > 2 && title.length < 90) {
          cards.push({
            id: this.generateUUID(),
            title: title,
            content: p.innerHTML,
            plainText: p.textContent.trim(),
            type: 'points',
            sourceMessageId
          });
        }
      }
    });

    return cards.length >= 2 ? cards : null;
  },

  // --- STRATEGY 5: Tables (Markdown table rows to cards) ---
  parseTable(container, sourceMessageId) {
    const table = container.querySelector('table');
    if (!table) return null;

    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    if (rows.length < 2) return null;

    return rows.map((row, index) => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length === 0) return null;

      const title = cells[0].textContent.trim();
      let contentHtml = '<div class="table-card-fields">';
      let plainText = `${title}: `;

      cells.forEach((cell, cellIdx) => {
        if (cellIdx === 0 && cells.length > 1) return; // Title is already displayed in header
        const label = headers[cellIdx] || `Field ${cellIdx + 1}`;
        const val = cell.innerHTML.trim();
        contentHtml += `<p><strong>${label}:</strong> ${val}</p>`;
        plainText += `[${label}: ${cell.textContent.trim()}] `;
      });
      contentHtml += '</div>';

      return {
        id: this.generateUUID(),
        title: title || `Row ${index + 1}`,
        content: contentHtml,
        plainText: plainText.trim(),
        type: 'product',
        sourceMessageId
      };
    }).filter(Boolean);
  }
};

// Register default strategies with priority order
CardParser.registerStrategy('ordered-list', 100, CardParser.parseOrderedList);
CardParser.registerStrategy('headings', 90, CardParser.parseHeadings);
CardParser.registerStrategy('table', 85, CardParser.parseTable);
CardParser.registerStrategy('unordered-list', 80, CardParser.parseUnorderedList);
CardParser.registerStrategy('bold-paragraphs', 70, CardParser.parseBoldParagraphs);

if (typeof window !== 'undefined') {
  window.SwipeGPTCardParser = CardParser;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CardParser;
}
