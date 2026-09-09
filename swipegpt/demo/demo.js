/**
 * SwipeGPT - Demo Sandbox Controller
 * Manages dataset switches, telemetry logs, physics tuning, and modal expansions.
 */

document.addEventListener('DOMContentLoaded', () => {
  const cardStackContainer = document.getElementById('demo-card-stack');
  const eventsLog = document.getElementById('events-log');
  const expandModal = document.getElementById('expand-modal');
  const modalCardTitle = document.getElementById('modal-card-title');
  const modalCardBody = document.getElementById('modal-card-body');
  
  let currentDatasetKey = 'projectIdeas';
  let engine = null;
  let activeExpandedCard = null;

  const telemetry = {
    viewed: 0,
    saved: 0,
    dismissed: 0,
    later: 0
  };

  let physicsSettings = {
    threshold: 0.35,
    rotation: 0.06
  };

  function updateTelemetryUI() {
    document.getElementById('count-viewed').textContent = telemetry.viewed;
    document.getElementById('count-saved').textContent = telemetry.saved;
    document.getElementById('count-dismissed').textContent = telemetry.dismissed;
    document.getElementById('count-later').textContent = telemetry.later;
  }

  function addLogEntry(type, title, detail) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    entry.innerHTML = `
      <span class="log-time">${now} · ${type.toUpperCase()}</span>
      <span class="log-title">${title}</span>
      <span style="color: var(--text-muted); font-size: 11px;">${detail}</span>
    `;
    eventsLog.prepend(entry);
  }

  function openExpandModal(card) {
    activeExpandedCard = card;
    modalCardTitle.textContent = card.title;
    modalCardBody.innerHTML = card.content;
    expandModal.classList.add('active');
  }

  function closeExpandModal() {
    expandModal.classList.remove('active');
    activeExpandedCard = null;
  }

  function loadDeck(datasetKey) {
    currentDatasetKey = datasetKey;
    const dataset = window.MOCK_DATASETS[datasetKey];
    if (!dataset) return;

    document.getElementById('active-dataset-title').textContent = dataset.name;
    document.getElementById('active-dataset-desc').textContent = dataset.description;

    // Deep clone cards array
    const deckCards = JSON.parse(JSON.stringify(dataset.cards));

    if (engine) {
      engine.destroy();
    }

    engine = new window.SwipeGPTEngine({
      container: cardStackContainer,
      cards: deckCards,
      thresholdRatio: physicsSettings.threshold,
      onAction: ({ card, direction, action, index }) => {
        if (action === 'close') {
          addLogEntry('info', 'Deck Finished', 'All cards reviewed in this dataset.');
          return;
        }

        telemetry.viewed += 1;

        if (direction === 'right') {
          telemetry.saved += 1;
          addLogEntry('save', card.title, 'Swiped Right → Saved');
        } else if (direction === 'left') {
          telemetry.dismissed += 1;
          addLogEntry('pass', card.title, 'Swiped Left ← Dismissed');
        } else if (direction === 'down') {
          telemetry.later += 1;
          addLogEntry('later', card.title, 'Swiped Down ↓ Saved for later');
        } else if (direction === 'up') {
          telemetry.saved += 1;
          addLogEntry('expand', card.title, 'Swiped Up ↑ Expanded details');
          openExpandModal(card);
        }

        updateTelemetryUI();
      }
    });

    engine.render();
  }

  // Bind Dataset Switchers
  const datasetButtons = document.querySelectorAll('.dataset-pill-btn');
  datasetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      datasetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadDeck(btn.dataset.dataset);
    });
  });

  // Bind Simulation Buttons
  document.getElementById('btn-sim-left')?.addEventListener('click', () => engine?.triggerSwipe('left'));
  document.getElementById('btn-sim-right')?.addEventListener('click', () => engine?.triggerSwipe('right'));
  document.getElementById('btn-sim-up')?.addEventListener('click', () => engine?.triggerSwipe('up'));
  document.getElementById('btn-sim-down')?.addEventListener('click', () => engine?.triggerSwipe('down'));

  // Bind Deck Reset & Undo
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    loadDeck(currentDatasetKey);
    addLogEntry('info', 'Deck Reset', `Reloaded ${currentDatasetKey} deck.`);
  });

  document.getElementById('btn-undo')?.addEventListener('click', () => {
    if (engine) {
      engine.undo();
      addLogEntry('info', 'Undo Swipe', 'Restored previous card.');
    }
  });

  // Bind Physics Controls
  const thresholdInput = document.getElementById('input-threshold');
  const thresholdVal = document.getElementById('val-threshold');
  thresholdInput?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    thresholdVal.textContent = `${val}%`;
    physicsSettings.threshold = val / 100;
    if (engine) engine.thresholdRatio = physicsSettings.threshold;
  });

  const rotationInput = document.getElementById('input-rotation');
  const rotationVal = document.getElementById('val-rotation');
  rotationInput?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    rotationVal.textContent = val.toFixed(2);
    physicsSettings.rotation = val;
  });

  // Modal Controls
  document.getElementById('btn-modal-close')?.addEventListener('click', closeExpandModal);
  document.getElementById('btn-modal-done')?.addEventListener('click', closeExpandModal);
  expandModal?.addEventListener('click', (e) => {
    if (e.target === expandModal) closeExpandModal();
  });

  document.getElementById('btn-modal-copy')?.addEventListener('click', async () => {
    if (activeExpandedCard) {
      const text = `${activeExpandedCard.title}\n\n${activeExpandedCard.plainText || ''}`;
      await navigator.clipboard.writeText(text);
      const copyBtn = document.getElementById('btn-modal-copy');
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy Text'; }, 1500);
    }
  });

  // Initial load
  loadDeck('projectIdeas');
});
