/**
 * TrackSmith Main Controller - Phase 5 High-Impact Build
 */

import { Engine } from './modules/engine.js';
import { Algorithms } from './modules/algorithms.js';
import { UI } from './modules/ui.js';
import { Exporter } from './modules/exporter.js';

class App {
    constructor() {
        this.engine = new Engine();
        this.ui = new UI();
        this.exporter = new Exporter();
        
        this.isPlaying = false;
        this.currentMood = 'pentatonic';
        this.currentSeed = Math.floor(Math.random() * 1000000);
        this.energy = 0.5;
        this.tracks = {};
        this.performanceMap = {};
        this.optimizedPerformance = {};
        this.snapshots = JSON.parse(localStorage.getItem('ts_snapshots') || '[]');
        
        this.initLoader();
    }

    async initLoader() {
        try {
            const manifest = await this.engine.loadManifest('assets/instruments.json');
            Object.keys(manifest.instruments).forEach(id => {
                this.tracks[id] = {
                    enabled: true,
                    complexity: 0.5, // Energy Density now primary controller
                    volume: id === 'tabla' ? 0.8 : (id === 'piano' ? 0.7 : 0.5)
                };
            });
            this.bindEvents();
            this.ui.renderSnapshots(this.snapshots, (s) => this.loadSnapshot(s));
            this.ui.updateStatus(`SEED: #${this.currentSeed}`, true);
        } catch (e) {
            this.ui.updateStatus("Manifest Fetch Error", false);
        }
    }

    async init() {
        if (this.engine.isStarted) return;
        this.ui.updateStatus("Downloading Samples...", true);
        await this.engine.init();
        this.exporter.init();
        const analyser = this.engine.getAnalyser();
        this.ui.startVisualizer(analyser);
        this.regenPerformance();
        this.setupLoop();
        this.ui.bindXYPad((x, y) => this.engine.updateFX(x, y));
        document.getElementById("btn-midi").disabled = false;
    }

    regenPerformance() {
        const loopData = Algorithms.Generate(this.currentSeed, this.currentMood, this.energy);
        this.performanceMap = loopData;
        this.optimizePerformance();
        this.ui.updateMarkers(loopData.markers);
    }

    optimizePerformance() {
        this.optimizedPerformance = {};
        Object.keys(this.performanceMap).forEach(id => {
            if (Array.isArray(this.performanceMap[id])) {
                this.optimizedPerformance[id] = {};
                this.performanceMap[id].forEach(h => {
                    if (!this.optimizedPerformance[id][h.time]) {
                        this.optimizedPerformance[id][h.time] = [];
                    }
                    this.optimizedPerformance[id][h.time].push(h);
                });
            }
        });
    }

    bindEvents() {
        document.getElementById("btn-master-play").addEventListener("click", async () => {
            await this.init();
            this.togglePlay();
        });

        document.getElementById("energy-slider").addEventListener("input", (e) => {
            this.energy = parseFloat(e.target.value);
            this.regenPerformance();
        });

        document.getElementById("bpm-range").addEventListener("input", (e) => {
            const bpm = parseInt(e.target.value);
            this.engine.setBPM(bpm);
            this.ui.updateBPM(bpm);
        });

        document.getElementById("mood-select").addEventListener("change", (e) => {
            this.currentMood = e.target.value;
            this.triggerSmartTransition();
        });

        // Attribution Modal Logic
        const modal = document.getElementById("modal-attribution");
        const attrArea = document.getElementById("text-attribution");

        document.getElementById("btn-copy-attribution").addEventListener("click", () => {
            const text = `Music: TrackSmith Algorithmic Engine (Scale: ${this.currentMood}, Seed: #${this.currentSeed})`;
            attrArea.value = text;
            modal.classList.remove("hidden");
        });

        document.getElementById("btn-modal-close").addEventListener("click", () => {
            modal.classList.add("hidden");
        });

        document.getElementById("btn-copy-finish").addEventListener("click", () => {
            navigator.clipboard.writeText(attrArea.value);
            modal.classList.add("hidden");
            this.ui.showToast("Copied!");
        });

        // Snapshots
        document.getElementById("btn-save-snapshot").addEventListener("click", () => {
            const s = { seed: this.currentSeed, mood: this.currentMood, energy: this.energy, bpm: Tone.Transport.bpm.value };
            this.snapshots.push(s);
            localStorage.setItem('ts_snapshots', JSON.stringify(this.snapshots));
            this.ui.renderSnapshots(this.snapshots, (s) => this.loadSnapshot(s));
            this.ui.showToast("Vibe Saved!");
        });

        // Dynamic Mixer
        Object.keys(this.tracks).forEach(id => {
            const toggle = document.getElementById(`toggle-${id}`);
            const vol = document.getElementById(`vol-${id}`);
            if (toggle) toggle.addEventListener("change", (e) => this.tracks[id].enabled = e.target.checked);
            if (vol) vol.addEventListener("input", (e) => this.engine.setStemVolume(id, parseFloat(e.target.value)));
        });

        // Exporter links
        document.getElementById("btn-record").addEventListener("click", (e) => {
            if (this.exporter.getIsRecording()) {
                this.exporter.stop();
                e.target.innerHTML = 'RECORD';
                document.getElementById("btn-download").disabled = false;
            } else {
                if (!this.isPlaying) this.togglePlay();
                this.exporter.start();
                e.target.innerHTML = 'STOP RECORDING';
                this.ui.updateStatus("🔴 RECORDING...", true);
            }
        });

        document.getElementById("btn-download").addEventListener("click", () => this.exporter.downloadAudio());
        document.getElementById("btn-midi").addEventListener("click", () => this.exporter.downloadMIDI(this.performanceMap));
    }

    triggerSmartTransition() {
        // Simple fill logic: inject fill but still regen full loop
        this.isPlayingFill = true;
        this.fillData = Algorithms.GenerateFill();
        setTimeout(() => {
            this.isPlayingFill = false;
            this.regenPerformance();
        }, 1000); // 1-bar transition at ~120BPM
    }

    loadSnapshot(s) {
        this.currentSeed = s.seed;
        this.currentMood = s.mood;
        this.energy = s.energy;
        this.engine.setBPM(s.bpm);
        this.regenPerformance();
        this.ui.updateStatus(`RESTORED: #${s.seed}`, true);
    }

    setupLoop() {
        let step = 0;
        Tone.Transport.scheduleRepeat((time) => {
            const beatIdx = step % 256;
            this.ui.updatePlaybackProgress(beatIdx);

            Object.keys(this.tracks).forEach(id => {
                if (this.tracks[id].enabled && this.optimizedPerformance[id]) {
                    const hits = this.optimizedPerformance[id][beatIdx];
                    if (hits) {
                        hits.forEach(h => this.engine.trigger(id, h.note, time));
                    }
                }
            });
            step++;
        }, "16n");
    }

    togglePlay() {
        if (this.isPlaying) {
            Tone.Transport.pause();
            this.isPlaying = false;
            this.ui.setPlayState(false);
            this.ui.updateStatus("Paused", false);
        } else {
            Tone.Transport.start();
            this.isPlaying = true;
            this.ui.setPlayState(true);
            this.ui.updateStatus("Jamming...", true);
        }
    }
}

new App();
