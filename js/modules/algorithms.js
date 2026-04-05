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

    // Hard-Coded Harmonic Structures (Roman Numerals for diatonic chords in C Major)
    // Represented as offsets from scale degrees
    CHORD_PROGRESSIONS: [
        [0, 5, 3, 4], // I - vi - IV - V
        [1, 4, 0, 0], // ii - V - I - I
        [5, 3, 0, 4], // vi - IV - I - V
        [0, 4, 5, 3]  // I - V - vi - IV
    ],

    // Markov transition matrix for melodic flows (scale index transitions)
    // e.g., index 0 (root) has probabilities to move to 0, 1, 2, etc.
    MARKOV_MATRIX: [
        [0.2, 0.3, 0.3, 0.1, 0.1], // from root
        [0.4, 0.1, 0.3, 0.1, 0.1], // from 2nd
        [0.2, 0.2, 0.2, 0.3, 0.1], // from 3rd
        [0.1, 0.2, 0.2, 0.2, 0.3], // from 4th
        [0.5, 0.1, 0.1, 0.2, 0.1]  // from 5th
    ],

    // Pink Noise generator state
    b0: 0, b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0,

    generatePinkNoise(rand) {
        let white = (rand() * 2) - 1;
        this.b0 = 0.99886 * this.b0 + white * 0.0555179;
        this.b1 = 0.99332 * this.b1 + white * 0.0750759;
        this.b2 = 0.96900 * this.b2 + white * 0.1538520;
        this.b3 = 0.86650 * this.b3 + white * 0.3104856;
        this.b4 = 0.55000 * this.b4 + white * 0.5329522;
        this.b5 = -0.7616 * this.b5 - white * 0.0168980;
        let pink = this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362;
        this.b6 = white * 0.115926;
        return Math.max(0, Math.min(1, (pink + 3) / 6)); // Normalize roughly to 0-1
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

        // Select a progression for this generation
        const progression = this.CHORD_PROGRESSIONS[Math.floor(rand() * this.CHORD_PROGRESSIONS.length)];

        // 2. PIANO (MARKOV MELODIC)
        let currentPos = 0; // Index in scale
        for (let i = 0; i < totalSteps; i++) {
            // Pink noise for rhythmic variance (durations/rests)
            const noiseProb = this.generatePinkNoise(rand);
            const prob = 0.15 + (energy * 0.4) + (noiseProb * 0.2);

            if (rand() < prob) {
                // Actual Markov transition
                const transitions = this.MARKOV_MATRIX[Math.min(currentPos, this.MARKOV_MATRIX.length - 1)];
                let r = rand();
                let sum = 0;
                let nextPos = 0;
                for (let j = 0; j < transitions.length; j++) {
                    sum += transitions[j];
                    if (r <= sum) {
                        nextPos = j;
                        break;
                    }
                }
                currentPos = nextPos;

                // Map to the scale
                const mappedPos = currentPos % scale.length;
                const midiNote = root + scale[mappedPos];

                // Convert MIDI to frequency/note name. Since we removed Tone.js, let's just keep the midiNote,
                // and the engine can play the frequency, or map it. The engine will expect midi notes directly.
                performance.piano.push({ time: i, note: midiNote });
            }
        }

        // 3. GUITAR (HARMONIC STRUCTURES)
        for (let i = 0; i < totalSteps; i += 16) { // Every bar
            const barIndex = Math.floor(i / 16);
            const chordRootDegree = progression[barIndex % progression.length];

            const prob = 0.3 + (energy * 0.4);
            if (rand() < prob || i === 0) {
                // Build a triad based on the hard-coded chord structure
                const chordNotes = [0, 2, 4].map(interval => {
                    const degree = (chordRootDegree + interval) % scale.length;
                    const octaveOffset = Math.floor((chordRootDegree + interval) / scale.length) * 12;
                    return root - 12 + scale[degree] + octaveOffset;
                });

                // Play rhythmic arpeggio from the chord
                performance.guitar.push({ time: i, note: chordNotes[0] });
                
                if (energy > 0.4 && rand() > 0.3) {
                    performance.guitar.push({ time: i + 4, note: chordNotes[1] });
                }
                if (energy > 0.6 && rand() > 0.5) {
                    performance.guitar.push({ time: i + 8, note: chordNotes[2] });
                }
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
