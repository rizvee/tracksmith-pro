/**
 * TrackSmith UI - Visual Timeline & Snapshot Support
 */

export class UI {
    constructor() {
        this.canvas = document.getElementById("viz-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.bpmVal = document.getElementById("bpm-val");
        this.btnMasterPlay = document.getElementById("btn-master-play");
        this.statusDisplay = document.getElementById("status-display");
        
        // Video Sync Elements
        this.timeline = document.getElementById("video-timeline");
        this.progBar = document.querySelector(".timeline-progress");
        
        // Snapshot Elements
        this.snapshotGallery = document.getElementById("snapshot-gallery");
        
        // X-Y Pad Elements
        this.xyPad = document.getElementById("xy-pad");
        this.xyPointer = document.getElementById("xy-pointer");
        
        // Sequencer Elements
        this.seqCanvas = document.getElementById("sequencer-canvas");
        if (this.seqCanvas) {
            this.seqCtx = this.seqCanvas.getContext("2d");
            this.gridData = {}; // Format: { "tabla": { "step_0_note_C3": true } }
            this.gridRows = ["C3", "D3", "E3", "F3", "G3", "A3", "B3", "C4"];
            this.gridCols = 16;
            this.cellWidth = 30;
            this.cellHeight = 20;
            this.activeInstrument = "tabla";
            this.currentStep = 0;
            this.manualOverrides = {};
        }

        this.init();
    }


    initTabs() {
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');

        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class
                this.tabBtns.forEach(b => b.classList.remove('active'));
                this.tabContents.forEach(c => c.classList.remove('active'));

                // Add active class to clicked tab
                btn.classList.add('active');
                const target = document.getElementById(btn.dataset.target);
                if (target) target.classList.add('active');
            });
        });
    }

    init() {
        this.initTabs();
        this.resize();
        window.addEventListener("resize", () => this.resize());
        if (this.seqCanvas) {
            this.initSequencer();
        }
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);

        if (this.seqCanvas) {
            const seqRect = this.seqCanvas.parentElement.getBoundingClientRect();
            this.seqCanvas.width = (this.gridCols * this.cellWidth) * dpr;
            this.seqCanvas.height = (this.gridRows.length * this.cellHeight) * dpr;
            this.seqCanvas.style.width = `${this.gridCols * this.cellWidth}px`;
            this.seqCanvas.style.height = `${this.gridRows.length * this.cellHeight}px`;
            this.seqCtx.scale(dpr, dpr);
            this.drawSequencer();
        }
    }

    updateBPM(bpm) {
        this.bpmVal.innerText = bpm;
    }

    updateStatus(msg, active = false) {
        this.statusDisplay.textContent = msg.toUpperCase();
        this.statusDisplay.className = active ? 'status-active' : 'status-idle';
    }

    setPlayState(isPlaying) {
        this.btnMasterPlay.innerHTML = isPlaying ? 
            '<span class="icon">■</span> STOP GENERATOR' : 
            '<span class="icon">▶</span> START GENERATOR';
        this.btnMasterPlay.style.background = isPlaying ? "#f43f5e" : "#3b82f6";
    }

    /**
     * VIDEO-SYNC MARKERS
     * Render the Intro, Bridge, and Ending points on the timeline
     */
    updateMarkers(markers) {
        // Clear old markers (everything except progBar)
        Array.from(this.timeline.children).forEach(child => {
            if (!child.classList.contains('timeline-progress')) child.remove();
        });

        // Add New Markers
        Object.entries(markers).forEach(([label, step]) => {
            const pos = (step / 256) * 100; // Map across 256 steps
            const marker = document.createElement("div");
            marker.className = "marker";
            marker.style.left = `${pos}%`;
            marker.innerHTML = `<span class="marker-label">${label.toUpperCase()}</span>`;
            this.timeline.appendChild(marker);
        });
    }

    updatePlaybackProgress(step) {
        const percent = ((step % 256) / 256) * 100;
        this.progBar.style.width = `${percent}%`;
    }

    /**
     * SNAPSHOT GALLERY
     */
    renderSnapshots(snapshots, onSelect) {
        this.snapshotGallery.innerHTML = "";
        snapshots.forEach(s => {
            const card = document.createElement("div");
            card.className = "snapshot-card";
            card.innerHTML = `Track: #${s.seed}<br>Mood: ${s.mood.toUpperCase()}`;
            card.onclick = () => onSelect(s);
            this.snapshotGallery.appendChild(card);
        });
    }

    showToast(msg) {
        this.updateStatus(msg, true);
        setTimeout(() => this.updateStatus("Ready", false), 2000);
    }

    bindXYPad(onUpdate) {
        const handleInteraction = (e) => {
            e.preventDefault();
            const rect = this.xyPad.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            let x = (clientX - rect.left) / rect.width;
            let y = 1 - (clientY - rect.top) / rect.height;
            x = Math.max(0, Math.min(1, x));
            y = Math.max(0, Math.min(1, y));
            
            this.xyPointer.style.left = `${x * 100}%`;
            this.xyPointer.style.top = `${(1 - y) * 100}%`;
            onUpdate(x, y);
        };

        let isDown = false;
        ['mousedown', 'touchstart'].forEach(ev => this.xyPad.addEventListener(ev, () => isDown = true));
        ['mouseup', 'touchend'].forEach(ev => window.addEventListener(ev, () => isDown = false));
        ['mousemove', 'touchmove'].forEach(ev => this.xyPad.addEventListener(ev, (e) => isDown && handleInteraction(e)));
    }

    updatePlaybackProgress(step) {
        const percent = ((step % 256) / 256) * 100;
        this.progBar.style.width = `${percent}%`;

        // Also update sequencer visual
        if (this.seqCanvas) {
            this.currentStep = step % this.gridCols;
            this.drawSequencer();
        }
    }

    /**
     * STEP SEQUENCER
     */
    initSequencer() {
        this.drawSequencer();

        this.seqCanvas.addEventListener('click', (e) => {
            const rect = this.seqCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const col = Math.floor(x / this.cellWidth);
            const row = Math.floor(y / this.cellHeight);

            if (col >= 0 && col < this.gridCols && row >= 0 && row < this.gridRows.length) {
                const note = this.gridRows[this.gridRows.length - 1 - row]; // bottom up
                const key = `${col}_${note}`;

                if (!this.manualOverrides[this.activeInstrument]) {
                    this.manualOverrides[this.activeInstrument] = {};
                }

                if (this.manualOverrides[this.activeInstrument][key]) {
                    delete this.manualOverrides[this.activeInstrument][key];
                } else {
                    this.manualOverrides[this.activeInstrument][key] = true;
                }

                this.drawSequencer();
            }
        });

        // Add instrument tabs or just use "tabla" for now to demonstrate
        // Usually you'd tie this to track selection in the UI
        document.querySelectorAll('.track-card').forEach(card => {
            card.addEventListener('click', () => {
                this.activeInstrument = card.dataset.track;
                this.drawSequencer();
            });
        });
    }

    drawSequencer() {
        if (!this.seqCtx) return;
        this.seqCtx.clearRect(0, 0, this.seqCanvas.width, this.seqCanvas.height);

        const instData = this.manualOverrides[this.activeInstrument] || {};

        for (let col = 0; col < this.gridCols; col++) {
            for (let row = 0; row < this.gridRows.length; row++) {
                const x = col * this.cellWidth;
                const y = row * this.cellHeight;
                const note = this.gridRows[this.gridRows.length - 1 - row];
                const key = `${col}_${note}`;

                this.seqCtx.strokeStyle = "rgba(255,255,255,0.1)";
                this.seqCtx.strokeRect(x, y, this.cellWidth, this.cellHeight);

                if (instData[key]) {
                    this.seqCtx.fillStyle = "#3b82f6";
                    this.seqCtx.fillRect(x + 2, y + 2, this.cellWidth - 4, this.cellHeight - 4);
                }
            }
        }

        // Draw playhead
        if (this.currentStep >= 0) {
            this.seqCtx.fillStyle = "rgba(244, 63, 94, 0.3)"; // Rose
            this.seqCtx.fillRect(this.currentStep * this.cellWidth, 0, this.cellWidth, this.gridRows.length * this.cellHeight);
        }
    }

    getManualOverrides() {
        return this.manualOverrides;
    }

    startVisualizer(analyser) {
        if (!analyser) return;

        // With pure Web Audio, analyser gives a Uint8Array of 0-255 values
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!analyser) return;
            requestAnimationFrame(draw);

            analyser.getByteTimeDomainData(dataArray);

            const w = this.canvas.width / (window.devicePixelRatio || 1);
            const h = this.canvas.height / (window.devicePixelRatio || 1);
            
            this.ctx.fillStyle = "rgba(10, 12, 16, 0.2)";
            this.ctx.fillRect(0, 0, w, h);
            
            this.ctx.beginPath();
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = "#3b82f6";
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = "rgba(59, 130, 246, 1)";
            
            const sliceWidth = w / bufferLength;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0; // 128 is center (0-255)
                const y = v * h / 2;

                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
                x += sliceWidth;
            }
            this.ctx.stroke();
        };
        draw();
    }
}
