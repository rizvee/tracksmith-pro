# 🎵 TrackSmith Pro: Advanced Algorithmic Music Engine

![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla-yellow?style=flat-square)
![Web Audio API](https://img.shields.io/badge/Web_Audio-API-blue?style=flat-square)
![Vitest](https://img.shields.io/badge/Tested_with-Vitest-brightgreen?style=flat-square)
![No AI](https://img.shields.io/badge/No_AI-Pure_Math-ff69b4?style=flat-square)

A high-performance, browser-based, no-AI music generator designed for content creators and musicians. TrackSmith Pro relies on pure mathematics, Euclidean Rhythms, Markov Chains, and deterministic seeds to algorithmically compose royalty-free background scores directly in your browser.

## 🚀 Key Features

*   **Algorithmic Engine**: Uses Euclidean Rhythms and Markov Chains for natural-sounding, probabilistic progression.
*   **Scale-Locked Melody**: Supports various scales and moods (Pentatonic, Raag Bhairavi, etc.) ensuring perfect harmony every time.
*   **Deterministic Seeds**: Every composition generates a unique **Track ID**. Application state is serialized and persisted via URL hashes, allowing you to share the ID or URL to reproduce the exact same track.
*   **Tabbed Architecture**: A comprehensive UI organized into functional modules: **Generator**, **Studio**, **Utilities**, **Ambience**, and **Theory**.
*   **Interactive Modules**: Includes a canvas-based step sequencer, virtual piano, drum machine, lo-fi mixer, and music theory flashcards.
*   **Web MIDI Support**: Integrates native Web MIDI API (`navigator.requestMIDIAccess`) for external controller support.
*   **High-Quality Audio Export**: Leverages `OfflineAudioContext` for sample-accurate rendering, allowing direct export to professional audio formats.

## 🛠️ Technical Stack & Architecture

TrackSmith Pro is built entirely with **Vanilla JavaScript**, prioritizing performance and security over heavy frameworks.

*   **Core Audio**: Native **Web Audio API** (`AudioContext`, `OfflineAudioContext`). Tone.js has been completely removed in favor of a native implementation.
*   **Audio Scheduling**: A custom lookahead/timer pattern utilizing `setTimeout` achieves sample-accurate scheduling against the Web Audio API's `currentTime`. The `performanceMap` data structure is optimized for O(1) lookups during scheduling.
*   **Instruments**: A central `assets/instruments.json` manifest manages remote sample configurations, dynamically loading them directly into native `AudioBuffer`s.
*   **Styling**: A utilitarian dark mode theme (`#111111`) prioritizing clean UI design with strict 8px border-radius limits. Descriptive text is handled gracefully via tooltips, utilizing **Lucide icons** for clean visual communication.
*   **Security**: Follows a strict standard of avoiding `innerHTML` in favor of `textContent` and `document.createElement` to mitigate Cross-Site Scripting (XSS) vulnerabilities.
*   **Infrastructure**: PWA-ready manifest, icons, and SEO-optimized HTML5 entry point.

## 📂 Project Structure

```text
tracksmith-pro/
├── index.html          # SEO-optimized entry point
├── package.json        # Dependencies & test scripts
├── assets/
│   └── instruments.json # Remote sample manifest
├── js/
│   ├── main.js         # App controller, audio scheduling & initialization
│   └── modules/
│       ├── engine.js    # Native Web Audio Context & FX chain
│       ├── algorithms.js # Euclidean rhythms & Markov logic
│       ├── ui.js        # Tabbed architecture & UI management
│       └── exporter.js  # Offline audio rendering logic
├── css/
│   └── style.css       # Utilitarian dark mode UI system
└── tests/              # Vitest test suite
```

## 🎹 How to Use

1.  **Launch**: Serve `index.html` via a local server (see instructions below) or open it in a modern browser.
2.  **Generate**: Explore the **Generator** tab to start algorithmically creating tracks. The app will fetch necessary instrument samples automatically.
3.  **Customize**:
    *   Change the **Mood** to swap active scales.
    *   Adjust the structural complexity to add or remove notes dynamically.
    *   Navigate through the **Studio**, **Ambience**, and other tabs to utilize the step sequencer, lo-fi mixer, and real-time effects.
4.  **Share & Save**:
    *   Copy the URL or Track ID to share your specific seed and state.
    *   Use the Export feature to render and download your composition directly using the `OfflineAudioContext` rendering engine.

## 💻 Local Development & Testing

To run the application locally, you must serve the root directory using a static HTTP server:

```bash
# Using Node.js http-server
npm install -g http-server
http-server -p 3000

# Or using Python 3
python3 -m http.server 3000
```
Then navigate to `http://localhost:3000` in your browser.

### Testing

The project uses Vitest with a `jsdom` environment.

```bash
# Install dependencies
npm install

# Run tests
npm run test
```
*Note: The engine uses global mocks for browser-specific APIs (`window`, `AudioContext`, `fetch`) when running tests in a Node.js environment. If Vitest is unavailable, you can also run native Node tests via `node --test tests/<filename>.test.js`.*

## 📜 License & Credits

Crafted with ❤️ by **[Hasan Rizvee](https://rizvee.github.io)**
GitHub: **[github.com/rizvee](https://github.com/rizvee)**

**"No AI models were used—just pure mathematics and music theory."**
This tool is open-source and intended for professional creators.
