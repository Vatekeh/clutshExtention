# Clutsh NSFW Monitor Chrome Extension

A Chrome extension (using Manifest V3) that detects "edging" behavior (prolonged interaction with NSFW content) and offers a support system by inviting users to join a support room at https://clutsh.live.

## Key Features

- **Behavior Detection**: Monitors for patterns that may indicate edging behavior:
  - Tab/window blur toggling
  - Video seek-backs (rewinding to specific sections)
  - Extended dwell time on a page
  - Video replays

- **Non-intrusive Notifications**: Shows a banner when edging is detected with options to join support or dismiss

- **Privacy-Focused**: Does not record URLs, capture content, or monitor specific page content

## Technical Improvements

- **Robust Context Handling**: Implemented safeChromeCall guards to prevent "Extension context invalidated" errors

- **Navigation Safety**: Added visibility state checks and page unload handlers to properly cleanup resources

- **Error Resilience**: Added unhandledrejection listener to swallow context invalidation errors

## Installation

See the [extension/README.md](extension/README.md) file for installation instructions.

## Support

For support, visit [https://clutsh.live](https://clutsh.live).