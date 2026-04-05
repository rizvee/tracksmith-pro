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
        
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener("resize", () => this.resize());
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
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

    startVisualizer(analyser) {
        if (!analyser) return;
        const ctx = this.canvas.getContext("2d");

        const draw = () => {
            if (!analyser) return;
            requestAnimationFrame(draw);

            const dataArray = analyser.getValue();
            const bufferLength = dataArray.length;

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
                // dataArray[i] is between -1.0 and 1.0. We map it to y coordinates from h to 0
                const v = (dataArray[i] + 1) / 2; // Normalize to 0..1
                const y = v * h;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
                x += sliceWidth;
            }
            this.ctx.stroke();
        };
        draw();
    }
}
