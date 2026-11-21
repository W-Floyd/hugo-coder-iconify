// Footnote hover previews: hovering (or keyboard-focusing) a footnote
// reference in the body pops up the note's text next to it, so a reader can
// take the aside without losing their place and scrolling to the bottom of the
// page and back.
//
// Purely an enhancement layered over Goldmark's stock markup — the reference is
// still a plain in-page link to the note, which is what happens with JS off, on
// a touch screen, or in the RSS feed. Content is cloned live from the rendered
// note, so nothing is duplicated in the served HTML.
(function () {
    const refs = document.querySelectorAll<HTMLAnchorElement>('a.footnote-ref');
    if (!refs.length) return;

    // Hover previews need a hovering pointer. On a touch screen there is no
    // hover state to speak of and a tap should keep jumping to the note, as it
    // always has.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    // Placement is CSS anchor positioning; without it the plain link stays.
    if (!CSS.supports('anchor-name', '--a')) return;

    const HIDE_DELAY = 120; // grace period to let the pointer cross the gap

    let popup: HTMLElement | null = null; // the single live bubble, if any
    let anchor: HTMLAnchorElement | null = null; // the reference it belongs to
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    function cancelHide() {
        clearTimeout(hideTimer);
        hideTimer = undefined;
    }

    function hide() {
        cancelHide();
        popup?.remove();
        popup = null;
        anchor?.classList.remove('footnote-active');
        anchor = null;
    }

    function scheduleHide() {
        cancelHide();
        hideTimer = setTimeout(hide, HIDE_DELAY);
    }

    function holdsFocus() {
        return !!anchor && (anchor === document.activeElement
            || !!popup?.contains(document.activeElement));
    }

    // The pointer wandering off shouldn't close a bubble the keyboard is using.
    function scheduleHideFromPointer() {
        if (!holdsFocus()) scheduleHide();
    }

    function show(ref: HTMLAnchorElement) {
        cancelHide();
        if (anchor === ref) return;
        hide();

        // The reference's href is the note's element id (`#fn:1`).
        const note = document.getElementById(decodeURIComponent((ref.getAttribute('href') || '').slice(1)));
        if (!note) return;

        const bubble = popup = document.createElement('span');
        popup.className = 'footnote-popup';
        bubble.setAttribute('role', 'note');
        // Snapshot the clone's children before moving them: childNodes is live,
        // so appending straight from it would skip every other node.
        for (const child of Array.from(note.cloneNode(true).childNodes)) bubble.appendChild(child);
        // Drop the "jump back to the reference" arrow — meaningless in a bubble
        // anchored to that very reference — and any cloned ids, which would
        // otherwise duplicate the ones already in the document.
        bubble.querySelectorAll('.footnote-backref').forEach((a) => a.remove());
        bubble.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));

        // Inserted after the <sup> rather than inside it: the bubble then
        // inherits body copy sizing instead of superscript sizing, and any links
        // in the note fall in tab order right after the reference.
        (ref.parentElement || ref).insertAdjacentElement('afterend', bubble);
        anchor = ref;
        // The bubble is placed by CSS against the active reference (--footnote).
        ref.classList.add('footnote-active');

        bubble.addEventListener('mouseenter', cancelHide);
        bubble.addEventListener('mouseleave', scheduleHideFromPointer);
    }

    for (const ref of refs) {
        ref.addEventListener('mouseenter', () => show(ref));
        ref.addEventListener('mouseleave', scheduleHideFromPointer);
        ref.addEventListener('focus', () => show(ref));
        // Following the link scrolls to the note itself; the preview has done
        // its job.
        ref.addEventListener('click', hide);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hide();
    });

    // Dismiss once focus leaves the reference-and-bubble pair — but not while it
    // merely moves between them, which is what tabbing from the reference into a
    // link inside the bubble does. relatedTarget is the element gaining focus;
    // reading document.activeElement here would still see the old one and pull
    // the bubble out from under the keyboard.
    document.addEventListener('focusout', (e) => {
        if (!popup) return;
        if (e.target !== anchor && !popup.contains(e.target as Node)) return;
        const to = e.relatedTarget as Node | null;
        if (to && (to === anchor || popup.contains(to))) return;
        scheduleHide();
    });
})();

export {};
