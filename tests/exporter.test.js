import { Exporter } from '../js/modules/exporter.js';

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

let originalBlob;
let originalURL;

function setup() {
    originalBlob = global.Blob;
    originalURL = global.URL;
    global.Blob = class {
        constructor(chunks, options) {
            this.chunks = chunks;
            this.options = options;
        }
    };
    global.URL = { createObjectURL: () => 'blob:mock-url' };
}

function teardown() {
    global.Blob = originalBlob;
    global.URL = originalURL;
}

export function testDownloadAudioEmptyChunks() {
    console.log("Running test: downloadAudio with empty chunks");
    setup();
    try {
        const exporter = new Exporter();
        let triggered = false;
        exporter._triggerDownload = () => { triggered = true; };

        exporter.downloadAudio();

        assert(triggered === false, "FAIL: _triggerDownload was called when chunks are empty.");
        console.log("✅ PASSED: _triggerDownload was not called when chunks are empty.");
    } finally {
        teardown();
    }
}

export function testDownloadAudioWithChunks() {
    console.log("Running test: downloadAudio with chunks");
    setup();
    try {
        const exporter = new Exporter();
        exporter.chunks = [{ data: 'some-audio-data' }];
        let triggered = false;
        exporter._triggerDownload = () => { triggered = true; };

        exporter.downloadAudio();

        assert(triggered === true, "FAIL: _triggerDownload was not called when chunks are present.");
        console.log("✅ PASSED: _triggerDownload was called when chunks are present.");
    } finally {
        teardown();
    }
}
