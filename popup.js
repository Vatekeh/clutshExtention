/**
 * @file popup.js
 * @description Logic for the browser-action popup. Handles sign-in/out,
 *              opening the support room, and linking to privacy policy.
 *              Runs in a small DOM environment (no React).
 */

document.addEventListener('DOMContentLoaded', () => {
  // Grab key DOM nodes once for performance
  const loginButton = document.getElementById('login');
  const supportButton = document.getElementById('open-support');
  const authSection = document.getElementById('auth-section');
  const privacyLink = document.getElementById('privacy-link');
  
  // Check if user is already logged in
  chrome.storage.local.get(['clutshToken', 'currentUserId'], (result) => {
    try {
      const { clutshToken, currentUserId } = result;
      
      if (clutshToken && currentUserId) {
        // User is logged in, update UI
        loginButton.textContent = 'Sign Out';
        
        // Add user info if needed
        const userInfo = document.createElement('p');
        userInfo.textContent = `Signed in (User ID: ${currentUserId.substring(0, 8)}...)`;
        userInfo.style.fontSize = '12px';
        userInfo.style.margin = '4px 0 0 0';
        authSection.appendChild(userInfo);
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
    }
  });
  
  // Login/Logout button handler
  loginButton.addEventListener('click', () => {
    try {
      chrome.storage.local.get(['clutshToken', 'currentUserId'], (result) => {
        const { clutshToken } = result;
        
        if (clutshToken) {
          // Sign out
          chrome.storage.local.remove(['clutshToken', 'currentUserId'], () => {
            loginButton.textContent = 'Sign in to Clutsh';
            window.location.reload();
          });
        } else {
          // Sign in - open auth page
          chrome.tabs.create({ url: 'https://clutsh.live/auth' });
        }
      });
    } catch (err) {
      console.error('Error handling auth action:', err);
    }
  });
  
  // Support room button handler
  supportButton.addEventListener('click', () => {
    try {
      chrome.storage.local.get(['clutshToken', 'currentUserId'], (result) => {
        const { clutshToken, currentUserId } = result;
        
        if (clutshToken && currentUserId) {
          // User is authenticated, open support room
          chrome.tabs.create({ 
            url: 'https://clutsh.live/support-room' 
          });
        } else {
          // User not authenticated, show alert or redirect to auth
          alert('Please sign in to join a support room');
        }
      });
    } catch (err) {
      console.error('Error opening support room:', err);
    }
  });
  
  // Privacy policy link
  privacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ 
      url: 'https://clutsh.live/privacy' 
    });
  });
}); 