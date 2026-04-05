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
        this.bpm = 120;
        this.tracks = {};
        this.performanceMap = {};
        this.snapshots = JSON.parse(localStorage.getItem('ts_snapshots') || '[]');

        // Scheduling State
        this.currentStep = 0;
        this.nextNoteTime = 0.0;
        this.lookahead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // s
        this.timerID = null;
        
        this.loadStateFromURL();
        this.initLoader();
    }

    loadStateFromURL() {
        if (window.location.hash) {
            try {
                const stateStr = decodeURIComponent(window.location.hash.substring(1));
                const state = JSON.parse(stateStr);
                this.currentSeed = state.seed || this.currentSeed;
                this.currentMood = state.mood || this.currentMood;
                this.energy = state.energy || this.energy;
                this.bpm = state.bpm || this.bpm;
            } catch (e) {
                console.error("Failed to parse URL state");
            }
        }
    }

    saveStateToURL() {
        const state = {
            seed: this.currentSeed,
            mood: this.currentMood,
            energy: this.energy,
            bpm: this.bpm
        };
        window.location.hash = encodeURIComponent(JSON.stringify(state));
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
        this.engine.setBPM(this.bpm);
        this.ui.updateBPM(this.bpm);
        this.ui.bindXYPad((x, y) => this.engine.updateFX(x, y));
        this.setupWebMIDI();
        document.getElementById("btn-download").disabled = false;
        // document.getElementById("btn-midi").disabled = false; // MIDI export removed
    }

    async setupWebMIDI() {
        const midiStatus = document.getElementById("midi-status");
        if (navigator.requestMIDIAccess) {
            try {
                const midiAccess = await navigator.requestMIDIAccess();
                if (midiAccess.inputs.size > 0) {
                    midiStatus.innerText = "MIDI: CONNECTED";
                    midiStatus.className = "status-active";

                    for (let input of midiAccess.inputs.values()) {
                        input.onmidimessage = (message) => {
                            const command = message.data[0];
                            const note = message.data[1];
                            const velocity = (message.data.length > 2) ? message.data[2] : 0;

                            // Note On
                            if (command === 144 && velocity > 0) {
                                // Just route it to piano for now
                                this.engine.trigger("piano", note, this.engine.ctx.currentTime);
                            }
                        };
                    }
                } else {
                    midiStatus.innerText = "MIDI: NO DEVICES";
                }

                midiAccess.onstatechange = (e) => {
                    if (e.port.type === "input") {
                        if (e.port.state === "connected") {
                            midiStatus.innerText = "MIDI: CONNECTED";
                            midiStatus.className = "status-active";
                        } else {
                            midiStatus.innerText = "MIDI: DISCONNECTED";
                            midiStatus.className = "status-idle";
                        }
                    }
                };
            } catch (err) {
                midiStatus.innerText = "MIDI: ERROR";
            }
        } else {
            midiStatus.innerText = "MIDI: UNSUPPORTED";
        }
    }

    regenPerformance() {
        const loopData = Algorithms.Generate(this.currentSeed, this.currentMood, this.energy);
        this.performanceMap = loopData;
        this.ui.updateMarkers(loopData.markers);
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

        document.getElementById("bpm-range").value = this.bpm;
        document.getElementById("bpm-range").addEventListener("input", (e) => {
            const bpm = parseInt(e.target.value);
            this.bpm = bpm;
            this.engine.setBPM(bpm);
            this.ui.updateBPM(bpm);
            this.saveStateToURL();
        });

        document.getElementById("mood-select").value = this.currentMood;
        document.getElementById("mood-select").addEventListener("change", (e) => {
            this.currentMood = e.target.value;
            this.triggerSmartTransition();
            this.saveStateToURL();
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
            const s = { seed: this.currentSeed, mood: this.currentMood, energy: this.energy, bpm: this.bpm };
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
        document.getElementById("btn-record").style.display = 'none'; // Replaced by offline render

        document.getElementById("btn-download").addEventListener("click", () => {
            this.ui.updateStatus("Rendering...", true);
            this.exporter.renderOffline(this.engine, this.performanceMap, this.bpm).then(() => {
                this.ui.updateStatus("Render Complete", false);
            });
        });

        // document.getElementById("btn-midi").addEventListener("click", () => this.exporter.downloadMIDI(this.performanceMap));
    }

    triggerSmartTransition() {
        // Simple fill logic: inject fill but still regen full loop
        setTimeout(() => {
            this.regenPerformance();
        }, 1000); // 1-bar transition at ~120BPM
    }

    loadSnapshot(s) {
        this.currentSeed = s.seed;
        this.currentMood = s.mood;
        this.energy = s.energy;
        this.bpm = s.bpm;
        this.engine.setBPM(s.bpm);
        this.regenPerformance();
        this.saveStateToURL();
        this.ui.updateStatus(`RESTORED: #${s.seed}`, true);
    }

    nextNote() {
        const secondsPerBeat = 60.0 / this.bpm;
        this.nextNoteTime += 0.25 * secondsPerBeat; // 16th note
        this.currentStep++;
        if (this.currentStep >= 256) {
            this.currentStep = 0;
        }
    }

    scheduleNote(beatNumber, time) {
        // UI updates happen via requestAnimationFrame or slightly delayed, but we try to sync
        requestAnimationFrame(() => {
            this.ui.updatePlaybackProgress(beatNumber);
        });

        // 1. Play algorithmic sequence
        Object.keys(this.tracks).forEach(id => {
            if (this.tracks[id].enabled && this.performanceMap[id]) {
                const hits = this.performanceMap[id].filter(h => h.time === beatNumber);
                hits.forEach(h => this.engine.trigger(id, h.note, time));
            }
        });

        // 2. Play manual overrides from sequencer
        const overrides = this.ui.getManualOverrides();
        const col = beatNumber % 16; // sequencer grid is 16 steps

        Object.keys(overrides).forEach(id => {
            if (this.tracks[id] && this.tracks[id].enabled) {
                const trackOverrides = overrides[id];
                Object.keys(trackOverrides).forEach(key => {
                    if (trackOverrides[key]) {
                        const parts = key.split('_');
                        const overrideCol = parseInt(parts[0]);
                        const overrideNote = parts[1];
                        if (overrideCol === col) {
                            this.engine.trigger(id, overrideNote, time);
                        }
                    }
                });
            }
        });
    }

    scheduler() {
        // while there are notes that will need to play before the next interval, schedule them
        while (this.nextNoteTime < this.engine.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentStep, this.nextNoteTime);
            this.nextNote();
        }
        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    togglePlay() {
        if (this.isPlaying) {
            clearTimeout(this.timerID);
            this.isPlaying = false;
            this.ui.setPlayState(false);
            this.ui.updateStatus("Paused", false);
        } else {
            if (this.engine.ctx.state === 'suspended') {
                this.engine.ctx.resume();
            }
            this.currentStep = 0;
            this.nextNoteTime = this.engine.ctx.currentTime + 0.05;
            this.scheduler();
            this.isPlaying = true;
            this.ui.setPlayState(true);
            this.ui.updateStatus("Jamming...", true);
        }
    }
}

new App();
