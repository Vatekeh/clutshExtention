/**
 * @file background.js
 * @description Service worker for the Clutsh Chrome extension. Handles:
 *  • OAuth callback tab detection and token persistence
 *  • Relay-style messaging between content-scripts and browser APIs
 *  • Opening the live support-room tab on request
 *
 * Runs in the MV3 background context (service worker). Keep everything
 * asynchronous and stateless where possible.
 */
// Constants
const AUTH_URL_PATTERN = 'https://clutsh.live/auth/callback*';

/**
 * Listener that intercepts every tab update. If the URL matches the OAuth
 * callback pattern we parse the hash fragment for `token` and `userId` and
 * persist them to `chrome.storage.local`. Finally closes the tab and pops a
 * notification.
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  try {
    if (changeInfo.url && changeInfo.url.match(AUTH_URL_PATTERN)) {
      const url = new URL(changeInfo.url);
      const params = new URLSearchParams(url.hash.substring(1));
      
      const token = params.get('token');
      const userId = params.get('userId');
      
      if (token && userId) {
        // Store auth info
        chrome.storage.local.set({ 
          clutshToken: token, 
          currentUserId: userId,
          authTs: Date.now()
        }, () => {
          console.log('[Clutsh] Authentication successful');
          // Close auth tab and show success notification
          chrome.tabs.remove(tabId);
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon128.png',
            title: 'Clutsh Sign-in Successful',
            message: 'You are now signed in to Clutsh NSFW Monitor.'
          });
        });
      }
    }
  } catch (err) {
    console.error('[Clutsh] Auth redirection error:', err);
  }
});

/**
 * Primary message router for content-scripts.
 * • GET_AUTH  → returns token & userId from storage.
 * • OPEN_SUPPORT_ROOM → creates a new tab pointing to the live support room.
 *
 * Always wrap async replies with `return true` to keep the message channel open.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'GET_AUTH') {
      chrome.storage.local.get(['clutshToken', 'currentUserId'], (result) => {
        sendResponse({
          token: result.clutshToken,
          userId: result.currentUserId,
          isAuthenticated: !!(result.clutshToken && result.currentUserId)
        });
      });
      return true; // Required for async response
    }
    
    if (message.type === 'OPEN_SUPPORT_ROOM') {
      chrome.tabs.create({ 
        url: message.roomUrl || 'https://clutsh.live/support-room'
      });
    }
  } catch (err) {
    console.error('[Clutsh] Message handler error:', err);
    sendResponse({ error: err.message });
  }
  
  return false;
}); 