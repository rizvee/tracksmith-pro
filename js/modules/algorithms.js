/**
 * TrackSmith Algorithmic Music Engine - V2 Energy & Sync
 */

export const Algorithms = {
    // PRNG: Mulberry32 for deterministic seeding
    createRandom(seed) {
        return function() {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    },

    SCALES: {
        pentatonic: [0, 2, 4, 7, 9], // C Major Pentatonic
        bhairavi: [0, 1, 3, 5, 7, 8, 10], // Phrygian / Raag Bhairavi
        yaman: [0, 2, 4, 6, 7, 9, 11], // Lydian / Raag Yaman
        dorian: [0, 2, 3, 5, 7, 9, 10], // Dorian Scale
        blue: [0, 3, 5, 6, 7, 10] // Blues Scale
    },

    EuclideanRhythm(pulses, steps) {
        let result = [];
        let bucket = 0;
        for (let i = 0; i < steps; i++) {
            bucket += pulses;
            if (bucket >= steps) {
                bucket -= steps;
                result.push(true);
            } else {
                result.push(false);
            }
        }
        return result;
    },

    /**
     * Energy-aware Track Generation
     * @param {number} seed - Unique vibe id
     * @param {string} scaleName - Selected mood
     * @param {number} energy - 0.0 to 1.0 (Note density control)
     */
    Generate(seed, scaleName, energy = 0.5) {
        const rand = this.createRandom(seed);
        const scale = this.SCALES[scaleName] || this.SCALES.pentatonic;
        const root = 48; // C3
        
        const performance = {
            tabla: [],
            piano: [],
            guitar: [],
            markers: {
               intro: 0,
               bridge: 128,  // Start of Bar 9
               ending: 224   // Start of Bar 15
            }
        };

        const totalSteps = 256; // 16 bars * 16 steps

        // 1. TABLA (EUCLIDEAN)
        // We generate a pattern for all 256 steps
        const tablaPulses = Math.floor(64 + (energy * 64)); // 64 to 128 pulses
        const tablaPattern = this.EuclideanRhythm(tablaPulses, totalSteps);
        const tablaNotes = ["C3", "C3", "D3", "E3"];

        tablaPattern.forEach((isHit, i) => {
            if (isHit) {
                const note = tablaNotes[Math.floor(rand() * tablaNotes.length)];
                performance.tabla.push({ time: i, note: note });
            }
        });

        // 2. PIANO (MARKOV CHORDAL)
        let currentPos = 0;
        for (let i = 0; i < totalSteps; i++) {
            const prob = 0.2 + (energy * 0.4);
            if (rand() < prob) {
                const step = rand() > 0.5 ? 1 : -1;
                currentPos = Math.max(0, Math.min(scale.length - 1, currentPos + step));
                const midiNote = root + scale[currentPos];
                performance.piano.push({ time: i, note: Tone.Frequency(midiNote, "midi").toNote() });
            }
        }

        // 3. GUITAR (AMBIENT PAD)
        for (let i = 0; i < totalSteps; i += 16) { // Every bar
            const prob = 0.2 + (energy * 0.5);
            if (rand() < prob || i === 0) {
                const chordRoot = root - 12 + scale[Math.floor(rand() * 3)];
                performance.guitar.push({ time: i, note: Tone.Frequency(chordRoot, "midi").toNote() });
            }
        }

        return performance;
    },

    /**
     * SMART TRANSITION: Generate a 1-bar Drum Fill
     */
    GenerateFill() {
        const fill = [];
        for (let i = 0; i < 16; i++) {
            if (Math.random() < 0.6) {
                fill.push({ time: i, note: i % 4 === 0 ? "C3" : "D3" });
            }
        }
        return fill;
    }
};
