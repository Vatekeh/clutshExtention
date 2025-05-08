// Constants
const AUTH_URL_PATTERN = 'https://clutsh.live/auth/callback*';

// Check for auth redirects and extract token + user ID
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

// Handle messages from content scripts
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