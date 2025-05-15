document.addEventListener('DOMContentLoaded', () => {
  const loginButton = document.getElementById('login');
  const authSection = document.getElementById('auth-section');
  const privacyLink = document.getElementById('privacy-link');
  
  const settingsIds = {
    immediateScan: document.getElementById('immediate-scan'),
    enableEdging: document.getElementById('enable-edging'),
    dwellSeconds: document.getElementById('dwell-seconds')
  };

  const DEFAULT_SETTINGS = {
    immediateScan: true,
    enableEdging: true,
    dwellSeconds: 300
  };

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

        // If authenticated, fetch remote logs
        loadRemoteHistory(clutshToken);
      } else {
        renderLocalHistory();
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
    }
  });
  
  // Load settings into UI
  chrome.storage.local.get(['clutshSettings'], (res) => {
    const s = { ...DEFAULT_SETTINGS, ...(res.clutshSettings || {}) };
    settingsIds.immediateScan.checked = s.immediateScan;
    settingsIds.enableEdging.checked = s.enableEdging;
    settingsIds.dwellSeconds.value = s.dwellSeconds;
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
          chrome.tabs.create({ url: 'https://ggbvhsuuwqwjghxpuapg.functions.supabase.co/auth' });
        }
      });
    } catch (err) {
      console.error('Error handling auth action:', err);
    }
  });
  
  // Privacy policy link
  privacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ 
      url: 'https://clutsh.live/privacy' 
    });
  });

  function renderLocalHistory() {
    chrome.storage.local.get(['detectionLogs'], (res) => {
      const logs = res.detectionLogs || [];
      if (logs.length === 0) return;
      renderHistorySection(logs.map(l=>({
        ts:l.ts,
        event_type:l.eventType,
        page_url:l.pageUrl
      })));
    });
  }

  function loadRemoteHistory(token) {
    const API_BASE = 'https://ggbvhsuuwqwjghxpuapg.functions.supabase.co';
    fetch(`${API_BASE}/api/detections?limit=20`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(r=>r.ok?r.json():Promise.reject())
    .then(data=>{
      if(data && data.logs) {
        renderHistorySection(data.logs);
      } else {
        renderLocalHistory();
      }
    })
    .catch(()=>{
      // fallback to local if remote fails
      renderLocalHistory();
    });
  }

  function renderHistorySection(logs) {
    const historySection = document.createElement('div');
    historySection.style.marginTop = '12px';

    const h3 = document.createElement('h3');
    h3.textContent = 'Detection History';
    h3.style.margin = '0 0 4px 0';
    h3.style.fontSize = '14px';
    historySection.appendChild(h3);

    const list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.padding = '0';
    list.style.margin = '0';

    logs.slice(0, 10).forEach((log) => {
      const li = document.createElement('li');
      li.style.fontSize = '12px';
      li.style.marginBottom = '4px';
      const date = new Date(log.detected_at || log.ts).toLocaleString();
      const eventType = log.event_type || log.eventType;
      const domain = (log.page_url || '').replace(/^https?:\/\//,'').split('/')[0];
      li.textContent = `[${date}] ${eventType}${domain?` – ${domain}`:''}`;
      list.appendChild(li);
    });

    historySection.appendChild(list);
    document.querySelector('.container').appendChild(historySection);
  }

  // Save handler
  document.getElementById('save-settings').addEventListener('click', () => {
    const newSettings = {
      immediateScan: settingsIds.immediateScan.checked,
      enableEdging: settingsIds.enableEdging.checked,
      dwellSeconds: parseInt(settingsIds.dwellSeconds.value, 10) || 300
    };
    chrome.storage.local.set({ clutshSettings: newSettings }, () => {
      alert('Settings saved!');
    });
  });
});