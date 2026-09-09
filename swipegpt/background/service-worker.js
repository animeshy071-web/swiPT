/**
 * SwipeGPT - Background Service Worker (Manifest V3)
 * Handles lifecycle events, message routing, and badge counter updates.
 */

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[SwipeGPT] Extension installed/updated:', details.reason);
  await updateBadge();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_BADGE') {
    updateBadge();
    sendResponse({ success: true });
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.swipegpt_cards) {
    updateBadge();
  }
});

async function updateBadge() {
  try {
    const data = await chrome.storage.local.get('swipegpt_cards');
    const cards = data.swipegpt_cards || [];
    const count = cards.length;

    if (count > 0) {
      await chrome.action.setBadgeText({ text: count > 99 ? '99+' : `${count}` });
      await chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    console.error('[SwipeGPT] Failed to update badge:', err);
  }
}
