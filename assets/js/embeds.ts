// Pushes the active theme to utterances/giscus; loaded only on pages that have one.
type Theme = 'light' | 'dark';

function theme(): Theme {
    const c = document.body.classList;
    if (c.contains('colorscheme-dark')) return 'dark';
    if (c.contains('colorscheme-light')) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function notifyEmbeds(wait: boolean) {
    const theme_ = theme();
    const setUtterances = (frame: HTMLIFrameElement) => frame.contentWindow?.postMessage(
        { type: 'set-theme', theme: theme_ === 'dark' ? 'github-dark' : 'github-light' },
        'https://utteranc.es'
    );
    const utterances = document.querySelector<HTMLIFrameElement>('.utterances-frame');
    if (utterances) setUtterances(utterances);
    else if (wait) waitForElm<HTMLIFrameElement>('.utterances-frame').then(setUtterances);

    const giscus = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
    if (giscus) giscus.contentWindow?.postMessage({ giscus: { setConfig: { theme: theme_ } } }, 'https://giscus.app');
}

function waitForElm<T extends Element>(selector: string) {
    return new Promise<T>((resolve) => {
        const found = document.querySelector<T>(selector);
        if (found) return resolve(found);
        const observer = new MutationObserver(() => {
            const el = document.querySelector<T>(selector);
            if (el) {
                resolve(el);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
}

// The utterances frame loads after this script, so wait for it once.
notifyEmbeds(true);
document.addEventListener('themeChanged', () => notifyEmbeds(false));

export {};
