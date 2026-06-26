const body = document.body;
const toggle = document.getElementById('dark-mode-toggle');
const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

// Three modes; the toggle cycles through them in this order.
const MODES = ['auto', 'light', 'dark'];

// Current mode: an explicit saved choice, else the server-rendered default
// reflected in the body class (already set by the inline resolver in baseof).
function currentMode() {
    const stored = localStorage.getItem('colorscheme');
    if (MODES.includes(stored)) return stored;
    if (body.classList.contains('colorscheme-light')) return 'light';
    if (body.classList.contains('colorscheme-dark')) return 'dark';
    return 'auto';
}

// Effective light/dark appearance for a mode ('auto' follows the OS).
function effectiveTheme(mode) {
    return mode === 'auto' ? (darkModeMediaQuery.matches ? 'dark' : 'light') : mode;
}

// Apply a mode. The body class drives both the CSS palette and which toggle
// icon shows; in 'auto' the CSS prefers-color-scheme rules follow the OS.
function applyMode(mode, waitForEmbeds) {
    body.classList.remove('colorscheme-auto', 'colorscheme-light', 'colorscheme-dark');
    body.classList.add('colorscheme-' + mode);
    document.documentElement.style.colorScheme = mode === 'auto' ? 'light dark' : mode;
    notifyEmbeds(effectiveTheme(mode), waitForEmbeds);
    document.dispatchEvent(new Event('themeChanged'));
}

// Persist a chosen mode and apply it.
function setMode(mode) {
    localStorage.setItem('colorscheme', mode);
    applyMode(mode, false);
}

// Sync runtime state with what the inline resolver already painted, and notify
// comment embeds (which load after this script) of the active theme.
applyMode(currentMode(), true);

if (toggle) {
    toggle.addEventListener('click', () => {
        setMode(MODES[(MODES.indexOf(currentMode()) + 1) % MODES.length]);
    });
}

// In 'auto' mode, follow live OS changes. The CSS @media rule already restyles
// the page; this keeps the color-scheme hint and comment embeds in sync.
darkModeMediaQuery.addEventListener('change', () => {
    if (currentMode() === 'auto') applyMode('auto', false);
});

// Push the active theme to comment embeds (utterances/giscus) if present.
function notifyEmbeds(theme, wait) {
    const setUtterances = (frame) => frame.contentWindow.postMessage(
        { type: 'set-theme', theme: theme === 'dark' ? 'github-dark' : 'github-light' },
        'https://utteranc.es'
    );
    const utterances = document.querySelector('.utterances-frame');
    if (utterances) setUtterances(utterances);
    else if (wait) waitForElm('.utterances-frame').then(setUtterances);

    const giscus = document.querySelector('iframe.giscus-frame');
    if (giscus) giscus.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, 'https://giscus.app');
}

function waitForElm(selector) {
    return new Promise((resolve) => {
        const found = document.querySelector(selector);
        if (found) return resolve(found);
        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                resolve(el);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
}

// Immersive view: scroll-driven `.scroll-crossfade` image sequences and the
// full-viewport header wallpaper (`body.has-header-wallpaper`). For crossfades,
// each image layer's opacity is set from the section's scroll progress so one
// image dissolves into the next — done in JS so it works without CSS
// scroll-driven animation support; if JS is off, the base CSS leaves the first
// image showing.
//
// A single floating toggle lets a visitor opt out of these pinned,
// scroll-hijacking effects: while one is on screen the toggle appears, and
// clicking it collapses the crossfades to plain image stacks and drops the
// fullscreen wallpaper to a normal page (and back). The choice is remembered
// site-wide; visitors with `prefers-reduced-motion: reduce` start collapsed.
(function () {
    const body = document.body;
    const sections = Array.from(document.querySelectorAll('.scroll-crossfade')).map((section) => ({
        section,
        frames: Array.from(section.querySelectorAll('.scroll-crossfade__frame')),
    }));
    const hasWallpaper = body.classList.contains('has-header-wallpaper');
    if (!sections.length && !hasWallpaper) return;

    const STORAGE_KEY = 'immersive';
    const COLLAPSED_CLASS = 'immersive-collapsed';
    const prefersReducedMotion = window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Collapsed unless the visitor has explicitly chosen the immersive view;
    // with no stored choice, reduced-motion users default to collapsed.
    function startsCollapsed() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'collapsed') return true;
        if (stored === 'immersive') return false;
        return !!prefersReducedMotion;
    }

    function isCollapsed() {
        return body.classList.contains(COLLAPSED_CLASS);
    }

    // Hermite smoothstep for a soft, eased crossfade.
    function smoothstep(edge0, edge1, x) {
        const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }

    let ticking = false;

    function update() {
        ticking = false;
        if (isCollapsed()) return;
        const vh = window.innerHeight;
        for (const { section, frames } of sections) {
            const n = frames.length;
            if (n < 2) continue;
            const rect = section.getBoundingClientRect();
            const travel = rect.height - vh; // distance the section scrolls while pinned
            // 0 when the section's top hits the top of the viewport, 1 once it
            // has scrolled all the way through.
            const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
            // Frame 0 is the always-opaque base; each later frame fades in
            // around its share (i / n) of the scroll. A narrow window means a
            // quick dissolve with a clear hold on each image either side.
            const halfWindow = 0.14 / n;
            for (let i = 1; i < n; i++) {
                const center = i / n;
                const o = smoothstep(center - halfWindow, center + halfWindow, p);
                frames[i].style.opacity = o;
                // Let right-click / interaction fall through faded-out layers so
                // it targets the image currently on screen, not the topmost one.
                frames[i].style.pointerEvents = o >= 0.5 ? 'auto' : 'none';
            }
        }
    }

    function applyCollapsed(collapsed) {
        body.classList.toggle(COLLAPSED_CLASS, collapsed);
        if (collapsed) {
            // Drop the JS-driven inline opacity so the collapsed CSS (all frames
            // visible, stacked) takes over.
            for (const { frames } of sections) {
                for (const frame of frames) {
                    frame.style.opacity = '';
                    frame.style.pointerEvents = '';
                }
            }
        } else {
            update();
        }
    }

    if (sections.length) {
        function onScroll() {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
    }

    // Floating opt-out toggle: visible only while an immersive effect is on
    // screen — any crossfade section, or the wallpaper hero (the first
    // viewport, gauged by scroll position).
    const toggle = document.getElementById('immersive-toggle');
    if (toggle) {
        const onScreen = new Set();
        let wallpaperInView = hasWallpaper;

        function refresh() {
            toggle.hidden = onScreen.size === 0 && !wallpaperInView;
        }

        if (sections.length && 'IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) onScreen.add(e.target);
                    else onScreen.delete(e.target);
                }
                refresh();
            });
            for (const { section } of sections) io.observe(section);
        }

        if (hasWallpaper) {
            const checkWallpaper = () => {
                const inView = window.scrollY < window.innerHeight;
                if (inView !== wallpaperInView) {
                    wallpaperInView = inView;
                    refresh();
                }
            };
            window.addEventListener('scroll', checkWallpaper, { passive: true });
            window.addEventListener('resize', checkWallpaper, { passive: true });
            checkWallpaper();
        }

        function flip() {
            const collapsed = !isCollapsed();
            localStorage.setItem(STORAGE_KEY, collapsed ? 'collapsed' : 'immersive');
            applyCollapsed(collapsed);
        }
        toggle.addEventListener('click', flip);
        toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                flip();
            }
        });

        refresh();
    }

    applyCollapsed(startsCollapsed());
})();
