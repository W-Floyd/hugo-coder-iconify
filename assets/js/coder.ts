import { onActivate } from './activate';

const body = document.body;
const toggle = document.getElementById('dark-mode-toggle');
const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

// Three modes; the toggle cycles through them in this order.
const MODES = ['auto', 'light', 'dark'] as const;
type Mode = (typeof MODES)[number];

// Current mode: an explicit saved choice, else the server-rendered default
// reflected in the body class (already set by the inline resolver in baseof).
function currentMode(): Mode {
    const stored = localStorage.getItem('colorscheme') as Mode;
    if (MODES.includes(stored)) return stored;
    if (body.classList.contains('colorscheme-light')) return 'light';
    if (body.classList.contains('colorscheme-dark')) return 'dark';
    return 'auto';
}

// Apply a mode. The body class drives both the CSS palette and which toggle
// icon shows; in 'auto' the CSS prefers-color-scheme rules follow the OS.
function applyMode(mode: Mode) {
    body.classList.remove('colorscheme-auto', 'colorscheme-light', 'colorscheme-dark');
    body.classList.add('colorscheme-' + mode);
    document.documentElement.style.colorScheme = mode === 'auto' ? 'light dark' : mode;
    document.dispatchEvent(new Event('themeChanged'));
}

// Persist a chosen mode and apply it.
function setMode(mode: Mode) {
    localStorage.setItem('colorscheme', mode);
    applyMode(mode);
}

// Sync runtime state with what the inline resolver already painted, and notify
// comment embeds (which load after this script) of the active theme.
applyMode(currentMode());

if (toggle) {
    onActivate(toggle, () => setMode(MODES[(MODES.indexOf(currentMode()) + 1) % MODES.length]));
}

// In 'auto' mode, follow live OS changes. The CSS @media rule already restyles
// the page; this keeps the color-scheme hint and comment embeds in sync.
darkModeMediaQuery.addEventListener('change', () => {
    if (currentMode() === 'auto') applyMode('auto');
});

// --- Image quality (low/med/hi) toggle -------------------------------------
// Images from the responsive-image pipeline carry a `data-rimg` marker; those
// that also ship `-hq` variants carry data-hq-src/-srcset (and data-hq-href on
// their full-size link). This toggle cycles every managed image through three
// quality modes, persisted in localStorage:
//   low  smallest stock variant, srcset dropped so the browser can't upgrade
//   med  the stock responsive set (src + srcset) — the as-rendered default
//   hi   the high-quality `-hq` companion set (where an image ships one)
// It appears whenever the page has any managed image.
const IMAGE_MODES = ['low', 'med', 'hi'] as const;
type ImageMode = (typeof IMAGE_MODES)[number];
const HQ_IMG_SELECTOR = 'img[data-rimg]';

function currentImageMode(): ImageMode {
    const stored = localStorage.getItem('imagequality') as ImageMode;
    return IMAGE_MODES.includes(stored) ? stored : 'med';
}

// Swap the page's images (and full-size links) to the chosen mode. The stock
// ("med") src/srcset — the as-rendered state — are stashed on first run so the
// other modes can be derived from and restored to them exactly. An eager LCP
// image (the featured image) ships its srcset deferred as data-srcset/-sizes so
// the preload scanner fetches only the small src; we promote it here for med/hi
// and leave it deferred for low, so low never triggers the larger fetch.
function applyImageMode(mode: ImageMode) {
    body.dataset.imageMode = mode;
    document.querySelectorAll<HTMLImageElement>(HQ_IMG_SELECTOR).forEach((img) => {
        if (img.dataset.medSrc === undefined) img.dataset.medSrc = img.getAttribute('src') || '';
        if (img.dataset.medSrcset === undefined) img.dataset.medSrcset = img.dataset.srcset || img.getAttribute('srcset') || '';
        if (img.dataset.medSizes === undefined) img.dataset.medSizes = img.dataset.sizes || img.getAttribute('sizes') || '';
        // Apply a srcset together with its sizes (deferred images carry no live
        // sizes attribute), or strip both when there's nothing to apply.
        const setSrcset = (srcset: string) => {
            if (srcset) {
                img.setAttribute('srcset', srcset);
                if (img.dataset.medSizes) img.setAttribute('sizes', img.dataset.medSizes);
            } else {
                img.removeAttribute('srcset');
            }
        };
        if (mode === 'hi' && img.dataset.hqSrc) {
            // Clear the stock srcset when the HQ set has none, else the browser
            // would keep picking a stock candidate over the HQ src.
            setSrcset(img.dataset.hqSrcset || '');
            img.setAttribute('src', img.dataset.hqSrc);
        } else if (mode === 'low') {
            // The stock src is already the smallest variant; drop the srcset so
            // the browser can't upgrade past it. Encode quality stays normal.
            img.removeAttribute('srcset');
            img.setAttribute('src', img.dataset.medSrc!);
        } else {
            setSrcset(img.dataset.medSrcset!);
            img.setAttribute('src', img.dataset.medSrc!);
        }
    });
    document.querySelectorAll<HTMLAnchorElement>('a[data-hq-href]').forEach((a) => {
        if (a.dataset.medHref === undefined) a.dataset.medHref = a.getAttribute('href') || '';
        a.setAttribute('href', mode === 'hi' ? a.dataset.hqHref! : a.dataset.medHref!);
    });
}

function setImageMode(mode: ImageMode) {
    localStorage.setItem('imagequality', mode);
    applyImageMode(mode);
}

const hqToggle = document.getElementById('hq-toggle');
if (hqToggle && document.querySelector(HQ_IMG_SELECTOR)) {
    hqToggle.hidden = false;
    applyImageMode(currentImageMode());
    const flipImageMode = () =>
        setImageMode(IMAGE_MODES[(IMAGE_MODES.indexOf(currentImageMode()) + 1) % IMAGE_MODES.length]);
    onActivate(hqToggle, flipImageMode);
}

// The RSS feed menu (home/social.html): an option's click copies its feed URL,
// which is what a reader wants, rather than opening raw XML. Without a
// clipboard (insecure context) the link just opens.
const FEED_COPY_HINT = 'Click to copy the feed link';
if (navigator.clipboard) {
    document.querySelectorAll<HTMLAnchorElement>('details.feed-menu a').forEach((a) => {
        a.dataset.copy = FEED_COPY_HINT;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const say = (msg: string) => {
                a.dataset.copy = msg;
                setTimeout(() => (a.dataset.copy = FEED_COPY_HINT), 2000);
            };
            navigator.clipboard.writeText(a.href).then(
                () => say('Copied!'),
                () => say("Couldn't copy: right-click, Copy Link"),
            );
        });
    });
}

// The menu is a <details>, which only closes from its own summary; also close
// it on Escape or a click elsewhere.
document.addEventListener('click', (e) => {
    document.querySelectorAll<HTMLDetailsElement>('details.feed-menu[open]').forEach((d) => {
        if (!d.contains(e.target as Node)) d.open = false;
    });
});
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll<HTMLDetailsElement>('details.feed-menu[open]').forEach((d) => {
        d.open = false;
        d.querySelector('summary')?.focus();
    });
});

export {};
