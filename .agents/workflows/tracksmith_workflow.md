# TrackSmith: Professional Algorithmic Music Engine Workflow

## 1. Project Identity
- **Name:** TrackSmith
- **Tagline:** No-AI Algorithmic Music Generator for High-Quality Background Scores.
- **Tech Stack:** Vanilla JS, Tone.js, CSS Flexbox/Grid.
- **Hosting:** Static (GitHub Pages).

## 2. Core Requirements
- **Online Library:** All instrument samples must be fetched from a remote CDN (e.g., jsDelivr).
- **Algorithmic Logic:** Use Markov Chains for melody and Euclidean Rhythms for percussion.
- **Mobile First:** Touch-optimized UI with performance pads for real-time effects.
- **SEO Ready:** Schema.org JSON-LD and semantic HTML for ranking.

## 3. Remote Asset Manifest Structure
Implement a central `instruments.json` manifest to manage the online library:
```json
{
  "instruments": {
    "tabla": {
      "baseUrl": "https://cdn.jsdelivr.net/gh/user/repo/assets/tabla/",
      "samples": { "C3": "dha.wav", "D3": "ta.wav", "E3": "tin.wav" }
    },
    "guitar": {
      "baseUrl": "https://cdn.jsdelivr.net/gh/user/repo/assets/guitar/",
      "samples": { "A2": "strum_A.mp3", "E2": "strum_E.mp3" }
    }
  }
}
```
