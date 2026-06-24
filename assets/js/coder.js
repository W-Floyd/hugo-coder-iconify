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
