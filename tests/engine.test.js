import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Mock Tone globally
global.Tone = {
    getContext: () => ({}),
    Compressor: class {
        toDestination() { return this; }
    },
    Limiter: class {
        connect() { return this; }
    },
    Reverb: class {
        connect() { return this; }
    },
    Filter: class {
        connect() { return this; }
    },
    Volume: class {
        connect() { return this; }
    },
    Sampler: class {
        connect() { return this; }
    },
    PolySynth: class {
        connect() { return this; }
    }
};

const { Engine } = await import('../js/modules/engine.js');

describe('Engine trigger fallback', () => {
    test('should trigger fallback if sampler throws an error', () => {
        const engine = new Engine();

        let fallbackTriggered = false;
        let mainTriggered = false;

        engine.samplers = {
            'test-id': {
                triggerAttackRelease: () => {
                    mainTriggered = true;
                    throw new Error('Sampler failed');
                },
                fallback: {
                    triggerAttackRelease: (note, duration, time) => {
                        fallbackTriggered = true;
                        assert.strictEqual(note, 'C4');
                        assert.strictEqual(duration, '8n');
                        assert.strictEqual(time, 0);
                    }
                }
            }
        };

        engine.trigger('test-id', 'C4', 0);

        assert.strictEqual(mainTriggered, true);
        assert.strictEqual(fallbackTriggered, true);
    });

    test('should NOT trigger fallback if sampler succeeds', () => {
        const engine = new Engine();

        let fallbackTriggered = false;
        let mainTriggered = false;

        engine.samplers = {
            'test-id': {
                triggerAttackRelease: () => {
                    mainTriggered = true;
                },
                fallback: {
                    triggerAttackRelease: () => {
                        fallbackTriggered = true;
                    }
                }
            }
        };

        engine.trigger('test-id', 'C4', 0);

        assert.strictEqual(mainTriggered, true);
        assert.strictEqual(fallbackTriggered, false);
    });
});
