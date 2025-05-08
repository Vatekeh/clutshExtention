# Clutsh NSFW Detector Chrome Extension

A Chrome extension that detects "edging" behavior (prolonged interaction with NSFW content) and offers a support system by inviting users to join a support room.

## Features

- Detects various edging behaviors:
  - Frequent tab/window blur toggling
  - Video seek-backs (rewinding to specific sections)
  - Extended dwell time on the same page
  - Video replays
- Presents a non-intrusive banner when edging is detected
- Option to join a support room or dismiss the notification
- Suppresses repeated notifications for a configurable period

## Installation

### Developer Mode

1. Download this folder or clone the repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select this extension folder
5. The extension should now be installed and active

## Usage

The extension works passively in the background:

1. As you browse, it monitors for patterns that may indicate edging behavior
2. When such patterns are detected, a banner appears at the bottom of the screen
3. You can choose to "Clutsh In" (join a support room) or "Ignore"
4. If you choose to join, you'll be directed to a support room in a new tab
5. After dismissing or timing out, notifications are suppressed for 10 minutes

## Troubleshooting

If you encounter any issues:

1. Make sure the extension has the necessary permissions
2. Check that the extension is enabled
3. Try reloading the extension from the Chrome extensions page
4. Clear your browser cache and restart Chrome

## Privacy

This extension:
- Does NOT record the URLs you visit
- Does NOT capture screenshots or record your screen
- Does NOT upload any content from the pages you visit
- Only sends your user ID to the server when edging is detected and you choose to join a support room

## Technical Details

The extension uses the following techniques to detect edging behavior:

- Window blur/focus events to track tab switching
- Video event listeners for seeking, timeupdate, and ended events
- Dwell time calculation using interval timers

API endpoints are configured with a fallback mechanism to ensure reliability.