/**
 * TrackSmith Engine - Pro Mastering & Performance FX
 */

export class Engine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.isStarted = false;
        this.manifest = null;
        this.buffers = {};
        this.stemGains = {};
        this.bpm = 120;
        
        // Final Mastering Chain
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -18;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;

        // Limiter approximation
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -1;
        this.limiter.ratio.value = 20;
        this.limiter.attack.value = 0.001;
        this.limiter.release.value = 0.1;
        
        // PERFORMANCE FX CHAIN
        this.reverb = this.ctx.createConvolver();
        this.reverb.buffer = this.createReverbBuffer(1.5);
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0.1;
        this.reverb.connect(this.reverbGain);
        this.reverbGain.connect(this.limiter);

        // Filter Array
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = "lowpass";
        this.filter.frequency.value = 2000;
        this.filter.connect(this.reverb);
        this.filter.connect(this.limiter);
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5; // Approx -6dB
        this.masterGain.connect(this.filter);

        this.limiter.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);
    }

    createReverbBuffer(duration) {
        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * duration;
        const impulse = this.ctx.createBuffer(2, length, sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) {
            const decay = Math.exp(-i / (sampleRate * (duration / 3)));
            left[i] = (Math.random() * 2 - 1) * decay;
            right[i] = (Math.random() * 2 - 1) * decay;
        }
        return impulse;
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
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
        
        const { instruments } = this.manifest;
        if (!instruments) throw new Error("Manifest instruments missing");

        this.buffers = {};
        const fetchPromises = [];

        Object.entries(instruments).map(([id, def]) => {
            this.stemGains[id] = this.ctx.createGain();
            this.stemGains[id].gain.value = 1.0;
            this.stemGains[id].connect(this.masterGain);

            this.buffers[id] = {};
            
            Object.entries(def.samples).forEach(([note, path]) => {
                const url = def.baseUrl + path;
                const p = fetch(url)
                    .then(res => res.arrayBuffer())
                    .then(data => this.ctx.decodeAudioData(data))
                    .then(buffer => {
                        this.buffers[id][note] = buffer;
                    }).catch(e => {
                        console.warn(`Could not load ${url}`);
                    });
                fetchPromises.push(p);
            });
        });

        await Promise.all(fetchPromises);
        this.isStarted = true;
    }

    midiToNoteName(midi) {
        const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const octave = Math.floor(midi / 12) - 1;
        const note = notes[midi % 12];
        return `${note}${octave}`;
    }

    trigger(id, noteInput, time) {
        if (!this.buffers[id]) return;

        let noteName = noteInput;
        // if it's a number (midi note), try to find a sample
        if (typeof noteInput === 'number') {
            noteName = this.midiToNoteName(noteInput);
        }

        // Simple fallback: play the first available sample if note not found,
        // and adjust playbackRate to change pitch
        let buffer = this.buffers[id][noteName];
        let rate = 1;

        if (!buffer) {
            // Find closest note
            const availableNotes = Object.keys(this.buffers[id]);
            if (availableNotes.length === 0) return; // No samples for this instrument

            // Just use the first one and detune
            buffer = this.buffers[id][availableNotes[0]];
            if (typeof noteInput === 'number') {
                // Approximate base note midi
                const baseMidi = 48; // C3
                rate = Math.pow(2, (noteInput - baseMidi) / 12);
            }
        }

        if (!buffer) return;

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = rate;

        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(1, time + 0.01);

        // 8n roughly duration based on bpm
        const duration = (60 / this.bpm) / 2;
        env.gain.setValueAtTime(1, time + duration - 0.05);
        env.gain.exponentialRampToValueAtTime(0.001, time + duration);

        source.connect(env);
        env.connect(this.stemGains[id]);

        source.start(time);
        source.stop(time + duration + 0.1);
    }

    /**
     * Stem Mixer Volume Update
     */
    setStemVolume(id, vol) {
        if (this.stemGains[id]) {
            // Native gain node uses linear amplitude 0..1
            this.stemGains[id].gain.value = vol;
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
        this.filter.frequency.exponentialRampToValueAtTime(cutoff, this.ctx.currentTime + 0.1);
        
        // Map Y to Reverb Wetness (0 to 0.6 max)
        const wet = y * 0.6;
        this.reverbGain.gain.setTargetAtTime(wet, this.ctx.currentTime, 0.1);
    }

    setBPM(bpm) {
        this.bpm = bpm;
    }

    getAnalyser() {
        const analyser = this.ctx.createAnalyser();
        analyser.fftSize = 512;
        this.masterGain.connect(analyser);
        return analyser;
    }
}
