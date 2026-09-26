/**
 * Site Interactivity & Design Studio Engine
 * Durgesh Salunkhe — Robotics Researcher
 */

document.addEventListener('DOMContentLoaded', () => {
    initDesignStudio();
    initMobileNav();
    initDancingLetters();
    initPublicationFilters();
});

/* ==========================================================================
   1. DANCING FONTS ON NAME HOVER
   ========================================================================== */
function initDancingLetters() {
    const letters = document.querySelectorAll('.dancing-letter:not(.space)');
    if (!letters.length) return;

    const playfulFonts = [
        "'Babylonica', cursive",
        "'Life Savers', cursive",
        "'Texturina', serif",
        "'Arvo', serif",
        "'PT Mono', monospace",
        "'Space Grotesk', sans-serif",
        "'Newsreader', serif"
    ];

    letters.forEach(letter => {
        letter.addEventListener('mouseenter', () => {
            const randomFont = playfulFonts[Math.floor(Math.random() * playfulFonts.length)];
            letter.style.fontFamily = randomFont;
        });

        letter.addEventListener('mouseleave', () => {
            setTimeout(() => {
                letter.style.fontFamily = '';
            }, 1200);
        });
    });
}

/* ==========================================================================
   2. DESIGN & TYPE STUDIO (Experimentation with fonts, scale, accent, theme)
   ========================================================================== */
function initDesignStudio() {
    const root = document.documentElement;

    // Load saved preferences or defaults
    const savedTheme = localStorage.getItem('ds_theme') || 'dark';
    const savedAccent = localStorage.getItem('ds_accent') || 'emerald';
    const savedFont = localStorage.getItem('ds_font') || 'hybrid';
    const savedScale = localStorage.getItem('ds_scale') || 'md';

    applyTheme(savedTheme);
    applyAccent(savedAccent);
    applyFont(savedFont);
    applyScale(savedScale);

    // Studio Drawer toggle
    const toggleBtn = document.getElementById('studioToggleBtn');
    const drawer = document.getElementById('studioDrawer');
    const closeBtn = document.getElementById('studioCloseBtn');

    if (toggleBtn && drawer) {
        toggleBtn.addEventListener('click', () => {
            drawer.classList.toggle('open');
        });
    }
    if (closeBtn && drawer) {
        closeBtn.addEventListener('click', () => {
            drawer.classList.remove('open');
        });
    }

    // Attach pill events
    document.querySelectorAll('[data-set-theme]').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-set-theme');
            applyTheme(val);
            localStorage.setItem('ds_theme', val);
        });
    });

    document.querySelectorAll('[data-set-accent]').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-set-accent');
            applyAccent(val);
            localStorage.setItem('ds_accent', val);
        });
    });

    document.querySelectorAll('[data-set-font]').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-set-font');
            applyFont(val);
            localStorage.setItem('ds_font', val);
        });
    });

    document.querySelectorAll('[data-set-scale]').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-set-scale');
            applyScale(val);
            localStorage.setItem('ds_scale', val);
        });
    });

    function applyTheme(theme) {
        root.setAttribute('data-theme', theme);
        document.querySelectorAll('[data-set-theme]').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-set-theme') === theme);
        });
    }

    function applyAccent(accent) {
        root.setAttribute('data-accent', accent);
        document.querySelectorAll('[data-set-accent]').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-set-accent') === accent);
        });
    }

    function applyFont(font) {
        root.setAttribute('data-font', font);
        document.querySelectorAll('[data-set-font]').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-set-font') === font);
        });
    }

    function applyScale(scale) {
        root.setAttribute('data-scale', scale);
        document.querySelectorAll('[data-set-scale]').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-set-scale') === scale);
        });
    }
}

/* ==========================================================================
   3. MOBILE NAVIGATION
   ========================================================================== */
function initMobileNav() {
    const toggle = document.querySelector('.mobile-nav-toggle');
    const links = document.querySelector('.nav-links');
    if (toggle && links) {
        toggle.addEventListener('click', () => {
            links.classList.toggle('open');
        });
    }
}

/* ==========================================================================
   4. PUBLICATION SEARCH & FILTERING (Instant, zero display=none bugs)
   ========================================================================== */
function initPublicationFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('paperSearch');
    const paperCards = document.querySelectorAll('.paper-card');

    if (!paperCards.length) return;

    let activeFilter = 'all';
    let searchQuery = '';

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.getAttribute('data-filter') || 'all';
            filterCards();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            filterCards();
        });
    }

    function filterCards() {
        let matchCount = 0;
        paperCards.forEach(card => {
            const categories = (card.getAttribute('data-category') || '').toLowerCase();
            const textContent = card.innerText.toLowerCase();

            const matchesCategory = (activeFilter === 'all') || categories.includes(activeFilter.toLowerCase());
            const matchesSearch = !searchQuery || textContent.includes(searchQuery);

            if (matchesCategory && matchesSearch) {
                card.style.display = 'block';
                matchCount++;
            } else {
                card.style.display = 'none';
            }
        });

        const countDisplay = document.getElementById('publicationCount');
        if (countDisplay) {
            countDisplay.innerText = `Showing ${matchCount} publication${matchCount === 1 ? '' : 's'}`;
        }
    }
}

/* Toggle Abstract */
window.toggleAbstract = function(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('show');
};

/* ==========================================================================
   5. PROJECT IMAGE CAROUSEL
   ========================================================================== */
window.cycleProjectImage = function(containerId, delta) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const slides = container.querySelectorAll('.gallery-slide');
    if (slides.length <= 1) return;

    let currentIndex = Array.from(slides).findIndex(s => !s.classList.contains('hidden'));
    if (currentIndex === -1) currentIndex = 0;

    slides[currentIndex].classList.add('hidden');
    let nextIndex = (currentIndex + delta + slides.length) % slides.length;
    slides[nextIndex].classList.remove('hidden');

    const counter = container.querySelector('.gallery-counter');
    if (counter) {
        counter.innerText = `${nextIndex + 1} / ${slides.length}`;
    }
};
