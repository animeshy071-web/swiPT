/**
 * SwipeGPT - Swipe Physics & Animation Engine
 * Handles pointer gestures (drag, flick, spring-back) and keyboard shortcuts for cards.
 */

class SwipeEngine {
  constructor(options = {}) {
    this.options = options;
    this.container = options.container || null;
    this.cards = options.cards || [];
    this.currentIndex = 0;
    this.history = [];
    this.onAction = options.onAction || (() => {});
    this.onProgress = options.onProgress || (() => {});
    this.thresholdRatio = options.thresholdRatio || 0.35;
    
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.startTime = 0;

    this.activeCardEl = null;
    this.nextCardEl = null;

    this._bindEvents();
  }

  setCards(cards) {
    this.cards = cards;
    this.currentIndex = 0;
    this.history = [];
    this.render();
  }

  _bindEvents() {
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    if (this.activeCardEl) {
      this.activeCardEl.removeEventListener('pointerdown', this._onPointerDown);
    }
  }

  _onKeyDown(e) {
    if (this.options.keyboardShortcuts === false) return;
    if (!this.container || this.container.offsetParent === null) return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.triggerSwipe('left');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.triggerSwipe('right');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.triggerSwipe('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.triggerSwipe('down');
    } else if (e.key.toLowerCase() === 'z' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.undo();
    }
  }

  _onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this.isDragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.currentX = e.clientX;
    this.currentY = e.clientY;
    this.startTime = Date.now();

    this.activeCardEl.setPointerCapture(e.pointerId);
    this.activeCardEl.style.transition = 'none';

    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerUp);
  }

  _onPointerMove(e) {
    if (!this.isDragging || !this.activeCardEl) return;

    this.currentX = e.clientX;
    this.currentY = e.clientY;

    const dx = this.currentX - this.startX;
    const dy = this.currentY - this.startY;
    const rotate = dx * 0.06;

    this.activeCardEl.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${rotate}deg)`;

    // Update overlay badges (SAVED, PASS, LATER, EXPAND)
    this._updateBadges(dx, dy);

    // Subtle scale & lift for the next card in stack
    if (this.nextCardEl) {
      const progress = Math.min(1, Math.hypot(dx, dy) / 250);
      const scale = 0.94 + progress * 0.06;
      const translateY = 18 - progress * 18;
      const opacity = 0.75 + progress * 0.25;
      this.nextCardEl.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
      this.nextCardEl.style.opacity = `${opacity}`;
    }
  }

  _onPointerUp(e) {
    if (!this.isDragging) return;
    this.isDragging = false;

    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerUp);

    const dx = this.currentX - this.startX;
    const dy = this.currentY - this.startY;
    const dt = Math.max(1, Date.now() - this.startTime);
    const velocityX = Math.abs(dx) / dt;
    const velocityY = Math.abs(dy) / dt;

    const width = this.activeCardEl.offsetWidth || 340;
    const height = this.activeCardEl.offsetHeight || 460;
    const thresholdX = width * this.thresholdRatio;
    const thresholdY = height * this.thresholdRatio;

    // Determine swipe direction
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > thresholdX || (dx > 50 && velocityX > 0.6)) {
        this.completeSwipe('right');
        return;
      }
      if (dx < -thresholdX || (dx < -50 && velocityX > 0.6)) {
        this.completeSwipe('left');
        return;
      }
    } else {
      if (dy < -thresholdY || (dy < -50 && velocityY > 0.6)) {
        this.completeSwipe('up');
        return;
      }
      if (dy > thresholdY || (dy > 50 && velocityY > 0.6)) {
        this.completeSwipe('down');
        return;
      }
    }

    // Spring back
    this.springBack();
  }

  _updateBadges(dx, dy) {
    if (!this.activeCardEl) return;
    const passBadge = this.activeCardEl.querySelector('.swipe-badge-pass');
    const likeBadge = this.activeCardEl.querySelector('.swipe-badge-like');
    const laterBadge = this.activeCardEl.querySelector('.swipe-badge-later');
    const exploreBadge = this.activeCardEl.querySelector('.swipe-badge-explore');

    const resetBadges = () => {
      [passBadge, likeBadge, laterBadge, exploreBadge].forEach(b => {
        if (b) b.style.opacity = '0';
      });
    };

    resetBadges();

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30 && likeBadge) {
        likeBadge.style.opacity = `${Math.min(1, (dx - 30) / 80)}`;
      } else if (dx < -30 && passBadge) {
        passBadge.style.opacity = `${Math.min(1, (-dx - 30) / 80)}`;
      }
    } else {
      if (dy > 30 && laterBadge) {
        laterBadge.style.opacity = `${Math.min(1, (dy - 30) / 80)}`;
      } else if (dy < -30 && exploreBadge) {
        exploreBadge.style.opacity = `${Math.min(1, (-dy - 30) / 80)}`;
      }
    }
  }

  springBack() {
    if (!this.activeCardEl) return;
    const anim = this.options.animationsEnabled !== false;
    this.activeCardEl.style.transition = anim ? 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none';
    this.activeCardEl.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
    this._updateBadges(0, 0);

    if (this.nextCardEl) {
      this.nextCardEl.style.transition = anim ? 'transform 0.35s ease, opacity 0.35s ease' : 'none';
      this.nextCardEl.style.transform = 'translate3d(0, 18px, 0) scale(0.94)';
      this.nextCardEl.style.opacity = '0.75';
    }
  }

  triggerSwipe(direction) {
    if (!this.activeCardEl || this.currentIndex >= this.cards.length) return;
    this.completeSwipe(direction);
  }

  completeSwipe(direction) {
    const cardEl = this.activeCardEl;
    if (!cardEl) return;

    const currentCard = this.cards[this.currentIndex];
    this.history.push({ card: currentCard, direction, index: this.currentIndex });

    const anim = this.options.animationsEnabled !== false;
    cardEl.style.transition = anim ? 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease' : 'none';

    let exitX = 0;
    let exitY = 0;
    let exitRotate = 0;

    switch (direction) {
      case 'right':
        exitX = window.innerWidth * 0.8;
        exitRotate = 25;
        currentCard.status = 'saved';
        break;
      case 'left':
        exitX = -window.innerWidth * 0.8;
        exitRotate = -25;
        currentCard.status = 'dismissed';
        break;
      case 'up':
        exitY = -window.innerHeight * 0.8;
        exitRotate = 0;
        currentCard.status = 'expanded';
        break;
      case 'down':
        exitY = window.innerHeight * 0.8;
        exitRotate = 0;
        currentCard.status = 'saved-for-later';
        break;
    }

    cardEl.style.transform = `translate3d(${exitX}px, ${exitY}px, 0) rotate(${exitRotate}deg)`;
    cardEl.style.opacity = '0';

    this.onAction({ card: currentCard, direction, index: this.currentIndex });

    setTimeout(() => {
      this.currentIndex += 1;
      this.render();
    }, anim ? 280 : 20);
  }

  undo() {
    if (this.history.length === 0) return;
    const last = this.history.pop();
    this.currentIndex = last.index;
    this.render();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    if (this.currentIndex >= this.cards.length) {
      this._renderFinishedState();
      return;
    }

    // Render remaining cards in reverse so top card is last element in DOM
    const visibleCards = this.cards.slice(this.currentIndex, this.currentIndex + 3);

    visibleCards.reverse().forEach((card, reverseIdx) => {
      const stackIndex = visibleCards.length - 1 - reverseIdx;
      const cardEl = document.createElement('div');
      cardEl.className = `swipegpt-card ${stackIndex === 0 ? 'active' : 'stacked'}`;
      cardEl.dataset.index = this.currentIndex + stackIndex;

      // Depth offset
      const translateY = stackIndex * 18;
      const scale = 1 - stackIndex * 0.06;
      const opacity = stackIndex === 0 ? 1 : (stackIndex === 1 ? 0.75 : 0.45);
      const zIndex = 30 - stackIndex;

      cardEl.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
      cardEl.style.opacity = `${opacity}`;
      cardEl.style.zIndex = `${zIndex}`;

      cardEl.innerHTML = `
        <div class="swipe-badge swipe-badge-like">SAVE</div>
        <div class="swipe-badge swipe-badge-pass">PASS</div>
        <div class="swipe-badge swipe-badge-later">LATER</div>
        <div class="swipe-badge swipe-badge-explore">EXPAND</div>

        <div class="card-header">
          <span class="card-tag">${card.type || 'Card'}</span>
          <span class="card-counter">${this.currentIndex + stackIndex + 1} / ${this.cards.length}</span>
        </div>
        <h3 class="card-title">${this._escapeHtml(card.title)}</h3>
        <div class="card-body-content">${card.content}</div>
        <div class="card-footer-controls">
          <button class="card-btn-action btn-dismiss" title="Dismiss (←)">✕</button>
          <button class="card-btn-action btn-later" title="Save for Later (↓)">⏱</button>
          <button class="card-btn-action btn-explore" title="Expand (↑)">⤢</button>
          <button class="card-btn-action btn-like" title="Save / Like (→)">♥</button>
        </div>
      `;

      // Attach click handlers to mini-buttons
      if (stackIndex === 0) {
        cardEl.querySelector('.btn-dismiss')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.triggerSwipe('left');
        });
        cardEl.querySelector('.btn-later')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.triggerSwipe('down');
        });
        cardEl.querySelector('.btn-explore')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.triggerSwipe('up');
        });
        cardEl.querySelector('.btn-like')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.triggerSwipe('right');
        });
      }

      this.container.appendChild(cardEl);
    });

    const cardElements = this.container.querySelectorAll('.swipegpt-card');
    this.activeCardEl = cardElements[cardElements.length - 1] || null;
    this.nextCardEl = cardElements[cardElements.length - 2] || null;

    if (this.activeCardEl) {
      this.activeCardEl.addEventListener('pointerdown', this._onPointerDown);
    }
  }

  _renderFinishedState() {
    const finishedEl = document.createElement('div');
    finishedEl.className = 'swipegpt-finished-card';
    finishedEl.innerHTML = `
      <div class="finished-icon">🎉</div>
      <h3>All Cards Evaluated</h3>
      <p>You have reviewed all ${this.cards.length} items.</p>
      <div class="finished-actions">
        <button class="finished-btn restart-btn">Review Again</button>
        <button class="finished-btn close-btn">Done</button>
      </div>
    `;

    finishedEl.querySelector('.restart-btn').addEventListener('click', () => {
      this.currentIndex = 0;
      this.render();
    });

    finishedEl.querySelector('.close-btn').addEventListener('click', () => {
      if (typeof this.onAction === 'function') {
        this.onAction({ action: 'close' });
      }
    });

    this.container.appendChild(finishedEl);
  }

  _escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

if (typeof window !== 'undefined') {
  window.SwipeGPTEngine = SwipeEngine;
}
