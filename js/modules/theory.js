export class TheoryFlashcards {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.cards = [
            { category: 'Intervals', front: 'Perfect 5th', back: '7 Semitones. Highly consonant. Found in most power chords.' },
            { category: 'Intervals', front: 'Major 3rd', back: '4 Semitones. Defines major chords. Happy/bright quality.' },
            { category: 'Intervals', front: 'Minor 3rd', back: '3 Semitones. Defines minor chords. Sad/dark quality.' },
            { category: 'Intervals', front: 'Tritone', back: "6 Semitones. The 'Devil\'s Interval'. Highly dissonant, wants to resolve." },

            { category: 'Chords', front: 'Major 7th (Maj7)', back: 'Root - M3 - P5 - M7. Jazzy, floaty, romantic.' },
            { category: 'Chords', front: 'Minor 7th (Min7)', back: 'Root - m3 - P5 - m7. Soulful, moody, smooth.' },
            { category: 'Chords', front: 'Dominant 7th (Dom7)', back: 'Root - M3 - P5 - m7. Bluesy, tense, leads to tonic.' },
            { category: 'Chords', front: 'Diminished', back: 'Root - m3 - d5. Very tense, horror, leading chord.' },

            { category: 'Scales', front: 'Dorian Mode', back: 'Minor scale with a raised 6th. Jazzy, funk, Santana vibes.' },
            { category: 'Scales', front: 'Mixolydian Mode', back: 'Major scale with a flat 7th. Rock/Blues, upbeat but bluesy.' },
            { category: 'Scales', front: 'Lydian Mode', back: 'Major scale with a raised 4th. Dreamy, magical, cinematic.' },
            { category: 'Scales', front: 'Phrygian Mode', back: 'Minor scale with a flat 2nd. Spanish/Middle-Eastern flavor, dark.' }
        ];

        this.currentCategory = 'All';
        this.filteredCards = this.cards;
        this.currentIndex = 0;
    }

    init() {
        if(!this.container) return;
        this.render();
        this.attachEventListeners();
        this.updateCard();
    }

    render() {
        this.container.innerHTML = `
            <div class="theory-wrapper glass">
                <div class="theory-header">
                    <h3>Music Theory Flashcards</h3>
                    <select id="theory-filter" class="glass-select">
                        <option value="All">All Categories</option>
                        <option value="Intervals">Intervals</option>
                        <option value="Chords">Chords</option>
                        <option value="Scales">Modes & Scales</option>
                    </select>
                </div>

                <div class="flashcard-container">
                    <div id="flashcard" class="flashcard">
                        <div class="flashcard-inner">
                            <div class="flashcard-front">
                                <span class="card-category" id="card-cat-front">Category</span>
                                <h2 id="card-front-text">Front</h2>
                                <p class="flip-hint">Click to flip</p>
                            </div>
                            <div class="flashcard-back">
                                <h3 id="card-back-title">Title</h3>
                                <p id="card-back-text">Back description goes here.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flashcard-controls">
                    <button id="btn-prev-card" class="btn-ghost">◀ Prev</button>
                    <span id="card-counter">1 / 12</span>
                    <button id="btn-next-card" class="btn-primary">Next ▶</button>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        const filter = document.getElementById('theory-filter');
        if(filter) {
            filter.addEventListener('change', (e) => {
                this.currentCategory = e.target.value;
                if(this.currentCategory === 'All') {
                    this.filteredCards = this.cards;
                } else {
                    this.filteredCards = this.cards.filter(c => c.category === this.currentCategory);
                }
                this.currentIndex = 0;
                this.updateCard();
            });
        }

        const card = document.getElementById('flashcard');
        if(card) {
            card.addEventListener('click', () => {
                card.classList.toggle('flipped');
            });
        }

        const btnPrev = document.getElementById('btn-prev-card');
        if(btnPrev) {
            btnPrev.addEventListener('click', () => {
                if(this.filteredCards.length === 0) return;
                this.currentIndex = (this.currentIndex - 1 + this.filteredCards.length) % this.filteredCards.length;
                this.updateCard();
            });
        }

        const btnNext = document.getElementById('btn-next-card');
        if(btnNext) {
            btnNext.addEventListener('click', () => {
                if(this.filteredCards.length === 0) return;
                this.currentIndex = (this.currentIndex + 1) % this.filteredCards.length;
                this.updateCard();
            });
        }
    }

    updateCard() {
        const cardEl = document.getElementById('flashcard');
        if(cardEl) cardEl.classList.remove('flipped'); // Reset flip state

        setTimeout(() => {
            if(this.filteredCards.length === 0) {
                document.getElementById('card-front-text').textContent = "No cards";
                document.getElementById('card-counter').textContent = "0 / 0";
                return;
            }

            const card = this.filteredCards[this.currentIndex];

            document.getElementById('card-cat-front').textContent = card.category;
            document.getElementById('card-front-text').textContent = card.front;

            document.getElementById('card-back-title').textContent = card.front;
            document.getElementById('card-back-text').textContent = card.back;

            document.getElementById('card-counter').textContent = `${this.currentIndex + 1} / ${this.filteredCards.length}`;
        }, 150); // wait for flip animation if it was flipped
    }
}