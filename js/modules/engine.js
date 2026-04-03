/**
 * TrackSmith Engine - Pro Mastering & Performance FX
 */

export class Engine {
    constructor() {
        this.ctx = Tone.getContext();
        this.isStarted = false;
        this.manifest = null;
        this.samplers = {};
        this.stemVolumes = {};
        
        // Final Mastering Chain (Phase 1/2 Requirement)
        this.compressor = new Tone.Compressor({ threshold: -18, ratio: 4 }).toDestination();
        this.limiter = new Tone.Limiter(-1).connect(this.compressor);
        
        // PERFORMANCE FX CHAIN (Phase 3 Requirement)
        this.reverb = new Tone.Reverb({ decay: 1.5, wet: 0.1 }).connect(this.limiter);
        this.filter = new Tone.Filter(2000, "lowpass").connect(this.reverb);
        
        this.masterNode = new Tone.Volume(-6).connect(this.filter);
    }

    async loadManifest(url = 'assets/instruments.json') {
        try {
            const resp = await fetch(url);
            this.manifest = await resp.json();
            return this.manifest;
        } catch (e) {
            console.error("Failed manifest", e);
            throw e;
        }
    }

    async init() {
        if (this.isStarted) return;
        await Tone.start();
        
        const { instruments } = this.manifest;
        if (!instruments) throw new Error("Manifest instruments missing");

        const samplerPromises = Object.entries(instruments).map(async ([id, def]) => {
            this.stemVolumes[id] = new Tone.Volume(0).connect(this.masterNode);
            
            return new Promise((resolve) => {
                this.samplers[id] = new Tone.Sampler({
                    urls: def.samples,
                    baseUrl: def.baseUrl, // Use per-instrument baseUrl
                    onload: () => resolve(true),
                    onerror: () => resolve(false)
                }).connect(this.stemVolumes[id]);
                this.samplers[id].fallback = new Tone.PolySynth().connect(this.stemVolumes[id]);
            });
        });

        await Promise.all(samplerPromises);
        this.isStarted = true;
    }

    trigger(id, note, time) {
        if (!this.samplers[id]) return;
        try {
            this.samplers[id].triggerAttackRelease(note, "8n", time);
        } catch (e) {
            this.samplers[id].fallback.triggerAttackRelease(note, "8n", time);
        }
    }

    /**
     * Stem Mixer Volume Update
     */
    setStemVolume(id, vol) {
        if (this.stemVolumes[id]) {
            // Linear gain (0 to 1) to Decibels
            const db = vol <= 0 ? -Infinity : 20 * Math.log10(vol);
            this.stemVolumes[id].volume.value = db;
        }
    }

    /**
     * X-Y Pad Performance FX Update
     * @param {number} x - 0..1 (Filter Cutoff)
     * @param {number} y - 0..1 (Reverb Mix)
     */
    updateFX(x, y) {
        // Map X to Filter Cutoff (500Hz to 15kHz)
        const cutoff = 500 + (x * 14500);
        this.filter.frequency.exponentialRampTo(cutoff, 0.1);
        
        // Map Y to Reverb Wetness (0 to 0.6 max)
        const wet = y * 0.6;
        this.reverb.wet.setTargetAtTime(wet, Tone.now(), 0.1);
    }

    setBPM(bpm) {
        Tone.Transport.bpm.value = bpm;
    }

    getAnalyser() {
        const analyser = new Tone.Analyser("waveform", 256);
        this.masterNode.connect(analyser); // Analyser on master signal
        return analyser;
    }
}
