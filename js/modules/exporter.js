/**
 * TrackSmith Exporter - Pro Export Suite for Audio (.WAV) and MIDI (.MID)
 */

export class Exporter {
    constructor() {
        this.recorder = null;
        this.chunks = [];
        this.isRecording = false;
        this.audioStream = null;
    }

    init() {
        const context = Tone.getContext();
        this.streamDest = context.createMediaStreamDestination();
        Tone.getDestination().connect(this.streamDest);
        this.audioStream = this.streamDest.stream;
    }

    start() {
        if (this.isRecording || !this.audioStream) return;
        this.chunks = [];
        this.recorder = new MediaRecorder(this.audioStream, { mimeType: 'audio/webm;codecs=opus' });
        this.recorder.ondataavailable = (e) => this.chunks.push(e.data);
        this.recorder.start();
        this.isRecording = true;
    }

    stop() {
        if (!this.isRecording) return;
        this.recorder.stop();
        this.isRecording = false;
    }

    /**
     * Download Audio (.webm/wav container)
     */
    downloadAudio() {
        if (this.chunks.length === 0) return;
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        this._triggerDownload(url, `tracksmith_audio_${Date.now()}.webm`);
    }

    /**
     * Generate and Download MIDI file
     * @param {object} performanceMap - from app state
     */
    downloadMIDI(performanceMap) {
        if (!performanceMap || !window.MidiWriter) return;

        const writer = new window.MidiWriter.Writer();
        
        // Loop through each instrument stem and create a track
        Object.keys(performanceMap).forEach(id => {
            const track = new window.MidiWriter.Track();
            track.setTempo(Tone.Transport.bpm.value);
            track.addTrackName(id.toUpperCase());

            const hits = performanceMap[id];
            hits.sort((a, b) => a.time - b.time);

            let lastTime = 0;
            hits.forEach(hit => {
                // Calculate delta time from previous hit (in ticks or 16ths)
                const startTick = hit.time * 128; // Standard 128 ticks per 16th note
                const wait = startTick - lastTime;
                
                track.addEvent(new window.MidiWriter.NoteEvent({
                    pitch: [hit.note],
                    duration: '16',
                    startTick: startTick
                }));
                // lastTime = startTick;
            });

            writer.addTrack(track);
        });

        const dataUri = writer.buildDataUri();
        this._triggerDownload(dataUri, `tracksmith_midi_${Date.now()}.mid`);
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
