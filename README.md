# 🎵 TrackSmith: Advanced Algorithmic Music Engine

A high-performance, browser-based, no-AI music generator designed for content creators and musicians. Generate royalty-free background scores directly in your browser using mathematical probability and seed-based determinism.

## 🚀 Live Features
- **Algorithmic Engine**: Uses Euclidean Rhythms and Markov Chains for natural-sounding progression.
- **Scale-Locked Melody**: Supports various scales/moods (Pentatonic, Raag Bhairavi, etc.) to ensure perfect harmony.
- **Deterministic Seeds**: Every track has a unique **Track ID**. Share the ID to reproduce the exact same composition.
- **Pro Mastering Chain**: Built-in Compressor and Limiter on the master bus for social-media-ready loudness.
- **Interactive FX Pad**: Real-time X-Y pad controlling Filter Cutoff (X) and Reverb Mix (Y).
- **Stem Mixer**: Adjust individual volumes for Tabla, Piano, and Guitar.
- **Pro Export**: 
  - 🔊 **WAV/OGG**: High-quality audio captured from the master output.
  - 🎹 **MIDI**: Multi-track MIDI export for integration into DAWs like Ableton or Logic Pro.

## 🛠️ Technical Stack
- **Audio Logic**: [Tone.js](https://tonejs.github.io/)
- **Composition Logic**: Vanilla JavaScript (ES6 Modules)
- **Styling**: Modern CSS with Glassmorphism and CSS Variables
- **MIDI Library**: [MidiWriter.js](https://github.com/grimmdude/MidiWriterJS)
- **Infrastructure**: PWA-ready manifest, PWA icons, and SEO-optimized HTML5.

## 📂 Project Structure
```text
tracksmith/
├── index.html          # SEO-optimized entry point
├── assets/
│   └── instruments.json # Remote sample manifest
├── js/
│   ├── main.js         # App controller & App init
│   └── modules/
│       ├── engine.js    # Audio context & FX chain
│       ├── algorithms.js # Euclidean & Markov logic
│       ├── ui.js        # Canvas visualizer & XY logic
│       └── exporter.js  # Audio & MIDI export suite
└── css/
    └── style.css       # Mobile-first Glassmorphism UI
```

## 🎹 How to Use
1. **Launch**: Open `index.html` in a modern browser.
2. **Start**: Click **START GENERATOR**. Tone.js will initialize and download instruments.
3. **Customize**: 
   - Change the **Mood** to swap scales.
   - Adjust the **Complexity** sliders to add or remove notes.
   - Use the **X-Y Pad** for cinematic filter sweeps.
4. **Export**: 
   - Toggle **RECORD** to capture a live take.
   - Click **MIDI** to download the raw performance for your DAW.

## 📜 License & Credits
Crafted with ❤️ by **[Hasan Rizvee](https://rizvee.github.io)**
GitHub: **[github.com/rizvee](https://github.com/rizvee)**

"No AI models were used—just pure mathematics and music theory."
This tool is open-source and intended for professional creators.
