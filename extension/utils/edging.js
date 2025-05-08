class EdgingTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.blurToggleCount = 0;
    this.videoSeekBacks = 0;
    this.dwellTime = 0;
    this.replays = 0;
  }

  /* Recorders */
  recordBlurToggle() {
    this.blurToggleCount += 1;
  }

  recordVideoSeekBack() {
    this.videoSeekBacks += 1;
  }

  recordReplay() {
    this.replays += 1;
  }

  incrementDwellTime(seconds) {
    this.dwellTime += seconds;
  }

  /* Heuristic check for edging */
  isEdging() {
    return (
      this.blurToggleCount > 3 ||
      this.videoSeekBacks > 5 ||
      this.dwellTime > 300
    );
  }
}

/**
 * Attach listeners to all current and future <video> tags on the page to track
 * seek-backs and replays.
 */
export const attachVideoListeners = (tracker) => {
  const handleVideoElement = (video) => {
    if (video.__clutshTracked) return; // prevent double-hook
    video.__clutshTracked = true;

    let lastTime = 0;

    video.addEventListener('seeking', () => {
      // Count as seek-back if user jumps back <=10s from current position
      if (video.currentTime + 10 < lastTime) {
        tracker.recordVideoSeekBack();
      }
      lastTime = video.currentTime;
    });

    video.addEventListener('ended', () => {
      tracker.recordReplay();
    });

    video.addEventListener('timeupdate', () => {
      lastTime = video.currentTime;
    });
  };

  // Track existing videos
  document.querySelectorAll('video').forEach(handleVideoElement);

  // Track future videos using MutationObserver
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === 'VIDEO') {
            handleVideoElement(node);
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('video').forEach(handleVideoElement);
          }
        });
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
};

/**
 * Attach window blur/focus events to count blur toggles that may indicate edging behavior.
 */
export const attachBlurListeners = (tracker) => {
  window.addEventListener('blur', () => tracker.recordBlurToggle());
  window.addEventListener('focus', () => tracker.recordBlurToggle());
};

export { EdgingTracker };