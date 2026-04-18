/**
 * TrackSmith Exporter - Pro Export Suite for Audio (.WAV) and MIDI (.MID)
 */

export class Exporter {
    constructor() {
        this.isRecording = false;
        // Keep a reference to main context to get sample rate, etc.
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    init() {
        // Not used for OfflineAudioContext rendering
    }

    start() {
        // Not used, we use non-real-time rendering
    }

    stop() {
        // Not used
    }

    /**
     * Offline Render Audio to WAV
     */
    async renderOffline(engine, performanceMap, bpm) {
        if (!engine.buffers) return;

        // Calculate total duration: 16 bars * 4 beats * (60/bpm)
        const duration = 16 * 4 * (60 / bpm);
        const sampleRate = 44100;
        
        const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

        // Setup offline chain similar to engine
        const masterGain = offlineCtx.createGain();
        masterGain.gain.value = 0.5;

        const compressor = offlineCtx.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.ratio.value = 4;

        const limiter = offlineCtx.createDynamicsCompressor();
        limiter.threshold.value = -1;
        limiter.ratio.value = 20;

        masterGain.connect(limiter);
        limiter.connect(compressor);
        compressor.connect(offlineCtx.destination);

        const stemGains = {};
        Object.keys(engine.buffers).forEach(id => {
            stemGains[id] = offlineCtx.createGain();
            stemGains[id].gain.value = engine.stemGains[id].gain.value;
            stemGains[id].connect(masterGain);
        });

        const timeStep = (60 / bpm) / 4; // 16th note duration

        Object.keys(performanceMap).forEach(id => {
            if (id === 'markers') return;
            const hits = performanceMap[id];

            hits.forEach(hit => {
                const time = hit.time * timeStep;
                
                let noteName = hit.note;
                if (typeof hit.note === 'number') {
                    noteName = engine.midiToNoteName(hit.note);
                }

                let buffer = engine.buffers[id][noteName];
                let rate = 1;

                if (!buffer) {
                    const availableNotes = Object.keys(engine.buffers[id]);
                    if (availableNotes.length === 0) return;
                    buffer = engine.buffers[id][availableNotes[0]];
                    if (typeof hit.note === 'number') {
                        rate = Math.pow(2, (hit.note - 48) / 12);
                    }
                }

                if (!buffer) return;

                const source = offlineCtx.createBufferSource();
                source.buffer = buffer;
                source.playbackRate.value = rate;

                const env = offlineCtx.createGain();
                env.gain.setValueAtTime(0, time);
                env.gain.linearRampToValueAtTime(1, time + 0.01);

                const noteDuration = (60 / bpm) / 2;
                env.gain.setValueAtTime(1, time + noteDuration - 0.05);
                env.gain.exponentialRampToValueAtTime(0.001, time + noteDuration);

                source.connect(env);
                env.connect(stemGains[id]);

                source.start(time);
                source.stop(time + noteDuration + 0.1);
            });
        });

        const renderedBuffer = await offlineCtx.startRendering();
        this.downloadWav(renderedBuffer);
    }

    downloadWav(audioBuffer) {
        const wavData = this.audioBufferToWav(audioBuffer);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        this._triggerDownload(url, `tracksmith_stem_${Date.now()}.wav`);
    }

    audioBufferToWav(buffer) {
        let numOfChan = buffer.numberOfChannels,
            length = buffer.length * numOfChan * 2 + 44,
            bufferArray = new ArrayBuffer(length),
            view = new DataView(bufferArray),
            channels = [], i, sample,
            offset = 0,
            pos = 0;

        // write WAVE header
        setUint32(0x46464952);                         // "RIFF"
        setUint32(length - 8);                         // file length - 8
        setUint32(0x45564157);                         // "WAVE"

        setUint32(0x20746d66);                         // "fmt " chunk
        setUint32(16);                                 // length = 16
        setUint16(1);                                  // PCM (uncompressed)
        setUint16(numOfChan);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
        setUint16(numOfChan * 2);                      // block-align
        setUint16(16);                                 // 16-bit (hardcoded in this export)

        setUint32(0x61746164);                         // "data" - chunk
        setUint32(length - pos - 4);                   // chunk length

        // write interleaved data
        for(i = 0; i < buffer.numberOfChannels; i++)
            channels.push(buffer.getChannelData(i));

        while(pos < buffer.length) {
            for(i = 0; i < numOfChan; i++) {
                // interleave channels
                sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
                view.setInt16(offset, sample, true);          // write 16-bit sample
                offset += 2;
            }
            pos++;
        }

        return bufferArray;

        function setUint16(data) {
            view.setUint16(offset, data, true);
            offset += 2;
        }

        function setUint32(data) {
            view.setUint32(offset, data, true);
            offset += 4;
        }
    }

    _triggerDownload(url, filename) {
        const a = document.createElement("a");
        a.href = url; a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 100);
    }

    getIsRecording() {
        return this.isRecording;
    }
}
