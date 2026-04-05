import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Exporter } from './exporter.js';

describe('Exporter Module', () => {
    let exporter;

    // Mocks
    const mockAudioStream = { id: 'mock-stream' };
    const mockContext = {
        createMediaStreamDestination: vi.fn(() => ({ stream: mockAudioStream }))
    };
    const mockDestination = {
        connect: vi.fn()
    };

    let mockMediaRecorderInstance;

    beforeEach(() => {
        // Reset DOM and Globals
        global.Tone = {
            getContext: vi.fn(() => mockContext),
            getDestination: vi.fn(() => mockDestination),
            Transport: { bpm: { value: 120 } }
        };

        mockMediaRecorderInstance = {
            start: vi.fn(),
            stop: vi.fn(),
            ondataavailable: null
        };

        global.MediaRecorder = class {
            constructor() {
                return mockMediaRecorderInstance;
            }
        };
        global.URL = {
            createObjectURL: vi.fn(() => 'blob:mock-url')
        };
        global.Blob = class {
            constructor() {}
        };

        global.window = global;

        // Mock MidiWriter
        const mockTrack = {
            setTempo: vi.fn(),
            addTrackName: vi.fn(),
            addEvent: vi.fn()
        };
        const mockWriter = {
            addTrack: vi.fn(),
            buildDataUri: vi.fn(() => 'data:audio/midi;base64,mockdata')
        };
        global.window.MidiWriter = {
            Writer: class {
                constructor() {
                    return mockWriter;
                }
            },
            Track: class {
                constructor() {
                    return mockTrack;
                }
            },
            NoteEvent: class {
                constructor() {}
            }
        };

        // DOM mocks for _triggerDownload
        document.createElement = vi.fn().mockImplementation((tag) => {
            if (tag === 'a') {
                return {
                    click: vi.fn(),
                    href: '',
                    download: ''
                };
            }
            return {};
        });
        document.body.appendChild = vi.fn();
        document.body.removeChild = vi.fn();

        vi.useFakeTimers();

        exporter = new Exporter();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllTimers();
    });

    describe('Initialization', () => {
        it('should initialize successfully and connect to Tone destination', () => {
            exporter.init();

            expect(Tone.getContext).toHaveBeenCalled();
            expect(mockContext.createMediaStreamDestination).toHaveBeenCalled();
            expect(Tone.getDestination).toHaveBeenCalled();
            expect(mockDestination.connect).toHaveBeenCalled();
            expect(exporter.audioStream).toBe(mockAudioStream);
        });
    });

    describe('Recording (MediaRecorder)', () => {
        beforeEach(() => {
            exporter.init();
        });

        it('should not start recording if already recording', () => {
            const mediaRecorderSpy = vi.spyOn(global, 'MediaRecorder');
            exporter.isRecording = true;
            exporter.start();
            expect(mediaRecorderSpy).not.toHaveBeenCalled();
        });

        it('should not start recording if no audio stream is initialized', () => {
            const mediaRecorderSpy = vi.spyOn(global, 'MediaRecorder');
            exporter.audioStream = null;
            exporter.start();
            expect(mediaRecorderSpy).not.toHaveBeenCalled();
        });

        it('should start recording successfully', () => {
            // Need to spy on the constructor to check arguments,
            // since we changed it to a class for new instantiation
            const mediaRecorderSpy = vi.spyOn(global, 'MediaRecorder');
            exporter.start();

            expect(mediaRecorderSpy).toHaveBeenCalledWith(mockAudioStream, { mimeType: 'audio/webm;codecs=opus' });
            expect(mockMediaRecorderInstance.start).toHaveBeenCalled();
            expect(exporter.isRecording).toBe(true);
            expect(exporter.getIsRecording()).toBe(true);

            // Simulate data available
            mockMediaRecorderInstance.ondataavailable({ data: 'chunk1' });
            expect(exporter.chunks).toEqual(['chunk1']);
        });

        it('should stop recording successfully', () => {
            exporter.start();
            exporter.stop();

            expect(mockMediaRecorderInstance.stop).toHaveBeenCalled();
            expect(exporter.isRecording).toBe(false);
            expect(exporter.getIsRecording()).toBe(false);
        });

        it('should not stop recording if not recording', () => {
            exporter.stop();
            expect(mockMediaRecorderInstance.stop).not.toHaveBeenCalled();
        });
    });

    describe('Audio Export', () => {
        beforeEach(() => {
            exporter.init();
        });

        it('should not download if no chunks are recorded', () => {
            const blobSpy = vi.spyOn(global, 'Blob');
            exporter.downloadAudio();
            expect(blobSpy).not.toHaveBeenCalled();
        });

        it('should create a blob and trigger download', () => {
            const blobSpy = vi.spyOn(global, 'Blob');
            exporter.chunks = ['data1', 'data2'];
            exporter.downloadAudio();

            expect(blobSpy).toHaveBeenCalledWith(['data1', 'data2'], { type: 'audio/webm' });
            expect(global.URL.createObjectURL).toHaveBeenCalled();
            expect(document.createElement).toHaveBeenCalledWith('a');
            expect(document.body.appendChild).toHaveBeenCalled();

            // Check that timeout is set for removal
            vi.runAllTimers();
            expect(document.body.removeChild).toHaveBeenCalled();
        });
    });

    describe('MIDI Export', () => {
        it('should not throw error and return early if no performance map is provided', () => {
            const writerSpy = vi.spyOn(global.window.MidiWriter, 'Writer');
            exporter.downloadMIDI(null);
            expect(writerSpy).not.toHaveBeenCalled();
        });

        it('should create MIDI tracks and trigger download', () => {
            const writerSpy = vi.spyOn(global.window.MidiWriter, 'Writer');
            const trackSpy = vi.spyOn(global.window.MidiWriter, 'Track');
            const noteEventSpy = vi.spyOn(global.window.MidiWriter, 'NoteEvent');

            const mockPerformanceMap = {
                piano: [
                    { time: 0, note: 'C4' },
                    { time: 1, note: 'D4' }
                ],
                drums: [
                    { time: 0, note: 'C1' }
                ]
            };

            exporter.downloadMIDI(mockPerformanceMap);

            expect(writerSpy).toHaveBeenCalled();
            expect(trackSpy).toHaveBeenCalledTimes(2); // One for piano, one for drums
            expect(noteEventSpy).toHaveBeenCalledTimes(3); // 2 piano notes, 1 drum note

            expect(document.createElement).toHaveBeenCalledWith('a');
            expect(document.body.appendChild).toHaveBeenCalled();
        });
    });
});
