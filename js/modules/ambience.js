export class LofiMixer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.channels = [
            { id: 'vinyl', name: 'Vinyl Crackle', type: 'noise', filterFreq: 3000, volume: 0.5 },
            { id: 'tape', name: 'Tape Hiss', type: 'noise', filterFreq: 8000, volume: 0.3 },
            { id: 'rain', name: 'Rain', type: 'noise', filterFreq: 1500, volume: 0 },
            { id: 'cafe', name: 'Cafe Murmur', type: 'noise', filterFreq: 500, volume: 0 },
            { id: 'wind', name: 'Wind', type: 'noise', filterFreq: 800, volume: 0 },
            { id: 'ocean', name: 'Ocean Waves', type: 'noise', filterFreq: 1200, volume: 0 }
        ];
        this.nodes = {};
    }

    init() {
        if (!this.container) return;
        this.render();
        this.setupAudio();
        this.attachEventListeners();
    }

    render() {
        let html = '<div class="mixer-board glass">';
        html += '<div class="mixer-header"><h3>Lo-Fi Mixer</h3><button id="btn-master-ambience" class="btn-secondary">Start Ambience</button></div>';
        html += '<div class="fader-grid">';

        this.channels.forEach(ch => {
            html += `
                <div class="fader-channel">
                    <label>${ch.name}</label>
                    <input type="range" class="fader-slider" id="fader-${ch.id}" min="0" max="1" step="0.01" value="${ch.volume}">
                    <span class="fader-val" id="val-${ch.id}">${Math.round(ch.volume * 100)}%</span>
                </div>
            `;
        });

        html += '</div></div>';
        this.container.innerHTML = html;
    }

    setupAudio() {
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.value = 0; // Starts muted until user clicks start
        this.masterGain.connect(this.audioCtx.destination);

        this.channels.forEach(ch => {
            // Generate simple noise buffer for ambience
            const bufferSize = this.audioCtx.sampleRate * 2; // 2 seconds of noise
            const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                if(ch.id === 'vinyl') {
                    // Crackle
                    data[i] = Math.random() < 0.01 ? Math.random() * 2 - 1 : 0;
                } else if(ch.id === 'tape') {
                    // Pink noise approx
                    data[i] = (Math.random() * 2 - 1) * 0.5;
                } else {
                    // Brownish noise approx
                    data[i] = (Math.random() * 2 - 1) * 0.2;
                }
            }

            const noiseSource = this.audioCtx.createBufferSource();
            noiseSource.buffer = buffer;
            noiseSource.loop = true;

            const filter = this.audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = ch.filterFreq;

            const gainNode = this.audioCtx.createGain();
            gainNode.gain.value = ch.volume;

            noiseSource.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterGain);

            noiseSource.start();

            this.nodes[ch.id] = { source: noiseSource, gain: gainNode, filter: filter };
        });
    }

    attachEventListeners() {
        const masterBtn = document.getElementById('btn-master-ambience');
        if(masterBtn) {
            masterBtn.addEventListener('click', () => {
                if(this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }

                if(this.masterGain.gain.value === 0) {
                    this.masterGain.gain.setTargetAtTime(1, this.audioCtx.currentTime, 0.5);
                    masterBtn.textContent = 'Stop Ambience';
                    masterBtn.classList.add('active');
                } else {
                    this.masterGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.5);
                    masterBtn.textContent = 'Start Ambience';
                    masterBtn.classList.remove('active');
                }
            });
        }

        this.channels.forEach(ch => {
            const slider = document.getElementById(`fader-${ch.id}`);
            const valDisplay = document.getElementById(`val-${ch.id}`);

            if(slider) {
                slider.addEventListener('input', (e) => {
                    const vol = parseFloat(e.target.value);
                    if(this.nodes[ch.id]) {
                        this.nodes[ch.id].gain.gain.setTargetAtTime(vol, this.audioCtx.currentTime, 0.1);
                    }
                    if(valDisplay) valDisplay.textContent = `${Math.round(vol * 100)}%`;
                });
            }
        });
    }
}