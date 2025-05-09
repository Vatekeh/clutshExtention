// Clutsh NSFW edging detection content script (UTF-8 encoded)

/* ------------------------------------------------------------------
   Lightweight copy of tracker & listeners (avoids ES-module import).
-------------------------------------------------------------------*/
class EdgingTracker {
  constructor() { this.reset(); }
  reset() { this.blurToggleCount=0; this.videoSeekBacks=0; this.dwellTime=0; this.replays=0; }
  recordBlurToggle(){ this.blurToggleCount+=1; }
  recordVideoSeekBack(){ this.videoSeekBacks+=1; }
  recordReplay(){ this.replays+=1; }
  incrementDwellTime(s){ this.dwellTime+=s; }
  isEdging(){return this.blurToggleCount>3||this.videoSeekBacks>5||this.dwellTime>300;}
}

const attachVideoListeners=(tracker)=>{
  const handle=(v)=>{
    if(v.__clutshTracked) return; v.__clutshTracked=true;
    let last=0;
    v.addEventListener('seeking',()=>{ if(v.currentTime+10<last) tracker.recordVideoSeekBack(); last=v.currentTime;});
    v.addEventListener('ended',()=>tracker.recordReplay());
    v.addEventListener('timeupdate',()=>{last=v.currentTime});
  };
  document.querySelectorAll('video').forEach(handle);
  new MutationObserver(muts=>{for(const m of muts){m.addedNodes&&m.addedNodes.forEach(n=>{if(n.tagName==='VIDEO')handle(n); if(n.querySelectorAll) n.querySelectorAll('video').forEach(handle);});}}).observe(document.body,{childList:true,subtree:true});
};
const attachBlurListeners=(t)=>{window.addEventListener('blur',()=>t.recordBlurToggle());window.addEventListener('focus',()=>t.recordBlurToggle());};

/* ----------------------------- Constants ------------------------------ */
const API_BASE='https://clutsh.live';
const FALLBACK_API_BASE='https://ggbvhsuuwqwjghxpuapg.functions.supabase.co';
const ON_EDGING_ENDPOINT='/onEdgingDetected';
const JOIN_INVITE_ENDPOINT='/joinInvite';
const SUPPRESS_MS=10*60*1000;
const CHECK_MS=15*1000;
const COUNTDOWN=60;

/* ----------------------------- State ---------------------------------- */
const tracker=new EdgingTracker();
attachVideoListeners(tracker);
attachBlurListeners(tracker);
let triggered=false, countdownId=null, loopId=null, isUnloading=false;
let SETTINGS = { immediateScan: true, enableEdging: true, dwellSeconds: 300 };
chrome.storage.local.get(['clutshSettings'], (res) => {
  SETTINGS = { ...SETTINGS, ...(res.clutshSettings || {}) };
  if (SETTINGS.immediateScan) {
    immediateScanCheck();
  }
  if (SETTINGS.enableEdging) {
    startMainLoop();
  }
});

/* --------------------------- Utilities -------------------------------- */
const now=()=>Date.now();
const EXT_ID = chrome?.runtime?.id ?? null;
const isContextGone = () => !chrome.runtime || chrome.runtime.id !== EXT_ID;
const safeChromeCall = (fn) => {
  try {
    if (!isContextGone()) fn();
  } catch (err) {
    if (String(err?.message).includes('Extension context invalidated')) return;
    throw err;
  }
};
const getAuth = () => {
  if (isContextGone()) {
    return Promise.resolve({ token: null, userId: null, isAuthenticated: false });
  }

  return new Promise((resolve) => {
    // Any sync "context invalidated" error will be swallowed here
    safeChromeCall(() => {
      chrome.runtime.sendMessage({ type: 'GET_AUTH' }, (resp) => {
        if (chrome.runtime.lastError) {
          return resolve({ token: null, userId: null, isAuthenticated: false });
        }
        const r = resp || {};
        resolve({
          token: r.token ?? null,
          userId: r.userId ?? null,
          isAuthenticated: !!r.isAuthenticated,
        });
      });
    });
  });
};

async function post(path,payload,token){const h={'Content-Type':'application/json',Authorization:`Bearer ${token}`};try{let r=await fetch(`${API_BASE}${path}`,{method:'POST',headers:h,body:JSON.stringify(payload)});if(!r.ok)throw 0;return r.json();}catch(e){let r=await fetch(`${FALLBACK_API_BASE}${path}`,{method:'POST',headers:h,body:JSON.stringify(payload)});if(!r.ok)throw 0;return r.json();}}

/* ---------------------------- Banner ---------------------------------- */
function banner({inviteId,roomUrl,userId,token}){
  const el=document.createElement('div');el.id='clutsh-banner';el.style.cssText='position:fixed;bottom:-200px;left:50%;transform:translateX(-50%);width:360px;background:#1a1a1a;color:#fff;padding:16px;border-radius:8px 8px 0 0;box-shadow:0 -2px 8px rgba(0,0,0,.3);font-family:Arial,sans-serif;z-index:2147483647;transition:bottom .3s ease-out;text-align:center';
  el.innerHTML=`<div style="margin-bottom:8px;">You're on the edge. <strong>3 people</strong> are live in your Clutsh room.<br/>Join within <span id="clutsh-count">${COUNTDOWN}</span>s to keep your streak.</div><div style="display:flex;gap:8px;justify-content:center;"><button id="clutsh-join" style="flex:1;padding:8px 12px;background:#00c37a;color:#fff;border:none;border-radius:4px;cursor:pointer;">Clutsh In</button><button id="clutsh-ignore" style="flex:1;padding:8px 12px;background:#555;color:#fff;border:none;border-radius:4px;cursor:pointer;">Ignore</button></div>`;
  document.body.appendChild(el);requestAnimationFrame(()=>el.style.bottom='0');
  let secs=COUNTDOWN;countdownId=setInterval(()=>{secs--;const c=document.getElementById('clutsh-count');if(c)c.textContent=String(secs);if(secs<=0){clearInterval(countdownId);dismiss();}},1000);
  el.querySelector('#clutsh-join').addEventListener('click',async()=>{
    if(isUnloading) return;
    try {
      safeChromeCall(()=> chrome.runtime.sendMessage({type:'OPEN_SUPPORT_ROOM',roomUrl}));
      await post(JOIN_INVITE_ENDPOINT,{inviteId,userId},token);
    } catch(_) {/* ignore if unloading */}
    dismiss();
  });
  el.querySelector('#clutsh-ignore').addEventListener('click',dismiss);
  function dismiss(){clearInterval(countdownId);el.style.bottom='-200px';setTimeout(()=>el.remove(),300);} }

/* ------------------------- Detection Loop ----------------------------- */
function startMainLoop(){
  loopId=setInterval(async()=>{
    if(isUnloading||document.visibilityState==='hidden'||isContextGone()){stopAll();return;}
    tracker.incrementDwellTime(CHECK_MS/1000);
    safeChromeCall(()=>{
      chrome.storage.local.get(['lastNudgeTs'],async r=>{
        const sup=r.lastNudgeTs&&now()-r.lastNudgeTs<SUPPRESS_MS;
        if(triggered||sup)return;
        if(!tracker.isEdging())return;
        triggered=true;
        const{token,userId,isAuthenticated}=await getAuth();
        if(!isAuthenticated)return;
        try{
          const inv=await post(ON_EDGING_ENDPOINT,{userId},token);
          safeChromeCall(()=> chrome.storage.local.set({lastNudgeTs:now()}));
          banner({inviteId:inv.inviteId,roomUrl:inv.roomUrl,userId,token});
        }catch(e){console.error('[Clutsh] onEdging err',e);}
      });
    });
  },CHECK_MS);
}

const stopAll=()=>{isUnloading=true;clearInterval(loopId);clearInterval(countdownId);} 
window.addEventListener('pagehide',stopAll);
window.addEventListener('beforeunload',stopAll);

// swallow late async errors once Chrome has torn the extension down
self.addEventListener('unhandledrejection',evt=>{
  if(String(evt?.reason?.message).includes('Extension context invalidated')){
    evt.preventDefault();
  }
});

console.log('[Clutsh] content script init');

function immediateScanCheck(){
  const KW=[ 'porn','xxx','xvideos','xhamster','redtube','nsfw','sex' ];
  const combined=(document.title+location.hostname+location.href).toLowerCase();
  const hit=KW.some(k=>combined.includes(k));
  if(hit){
    getAuth().then(({token,userId,isAuthenticated})=>{
      banner({inviteId:'KW-'+Date.now(),roomUrl:location.href,userId:userId||'',token:token||''});
    });
  }
}