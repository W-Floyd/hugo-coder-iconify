// The float toggles are <a role="button">, so Enter/Space must be wired by hand.
export function onActivate(el: HTMLElement, fn: () => void) {
    el.addEventListener('click', fn);
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fn();
        }
    });
}
