// Player for the immich-video shortcode. Built by js.Build; @params carries
// the fingerprinted hls.js URL. Every shortcode instance links this file, so
// the flag keeps it to one run per page.
import * as params from '@params';

const TIERS: Record<string, number> = { low: 480, med: 720, hi: 1080 };
const SVG_NS = 'http://www.w3.org/2000/svg';
// f: the first path is filled; the rest are stroked.
const ICONS: Record<string, { f: number; d: string[] }> = {
  play: { f: 1, d: ['M8 5v14l11-7z'] },
  pause: { f: 1, d: ['M6 5h4v14H6zM14 5h4v14h-4z'] },
  vol: { f: 1, d: ['M3 9v6h4l5 5V4L7 9z', 'M16 8.5a5 5 0 0 1 0 7', 'M19 6a9 9 0 0 1 0 12'] },
  mute: { f: 1, d: ['M3 9v6h4l5 5V4L7 9z', 'M16 9l5 6', 'M21 9l-5 6'] },
  fs: { f: 0, d: ['M5 9V5h4', 'M15 5h4v4', 'M19 15v4h-4', 'M9 19H5v-4'] },
};

// The site's low/med/hi image toggle (coder.js) as a target video height.
function tier() {
  let mode: string | null | undefined = document.body.dataset.imageMode;
  try {
    mode = mode || localStorage.getItem('imagequality');
  } catch (e) {}
  return (mode && TIERS[mode]) || 720;
}

// The level nearest the tier's size, cheapest bitrate on a tie.
function pick(levels: HlsLevel[], target: number) {
  let best = -1;
  let gap = Infinity;
  levels.forEach((level, i) => {
    const d = Math.abs(Math.min(level.width, level.height) - target);
    if (d < gap || (d === gap && level.bitrate < levels[best].bitrate)) {
      gap = d;
      best = i;
    }
  });
  return best;
}

function icon(name: string) {
  const { f, d } = ICONS[name];
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  d.forEach((path, i) => {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', path);
    if (f && i === 0) {
      p.setAttribute('fill', 'currentColor');
    } else {
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', 'currentColor');
      p.setAttribute('stroke-width', '2');
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
    }
    svg.appendChild(p);
  });
  return svg;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, label?: string) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (label) e.setAttribute('aria-label', label);
  return e;
}

function button(className: string, label: string) {
  const b = el('button', className, label);
  b.type = 'button';
  return b;
}

function setIcon(b: HTMLElement, name: string) {
  b.textContent = '';
  b.appendChild(icon(name));
}

function formatTime(s: number) {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec > 9 ? '' : '0'}${sec}`;
}

function controls(box: HTMLElement, video: ImmichVideo) {
  const bar = el('div', 'iv-bar');
  const play = button('iv-btn iv-play', 'Play');
  const seek = el('input', 'iv-seek', 'Seek');
  const time = el('span', 'iv-time');
  const mute = button('iv-btn iv-mute', 'Mute');
  const quality = button('iv-q', 'Quality');
  const fullscreen = button('iv-btn iv-fs', 'Fullscreen');
  seek.type = 'range';
  let dragging = false;
  seek.min = '0';
  seek.max = '1000';
  seek.value = '0';
  quality.hidden = true;
  setIcon(fullscreen, 'fs');
  bar.append(seek, time, quality);
  box.append(bar, play, mute, fullscreen);

  const toggle = () => (video.paused ? video.play().catch(() => {}) : video.pause());
  const sync = () => {
    setIcon(play, video.paused ? 'play' : 'pause');
    play.setAttribute('aria-label', video.paused ? 'Play' : 'Pause');
    box.classList.toggle('iv-paused', video.paused);
    setIcon(mute, video.muted ? 'mute' : 'vol');
    mute.setAttribute('aria-label', video.muted ? 'Unmute' : 'Mute');
  };
  const showTime = () => {
    const d = video.duration;
    time.textContent = `${formatTime(video.currentTime)} / ${formatTime(d)}`;
    if (d && isFinite(d) && !dragging) seek.value = String((video.currentTime / d) * 1000);
  };

  ['play', 'pause', 'volumechange'].forEach((e) => video.addEventListener(e, sync));
  ['timeupdate', 'durationchange', 'loadedmetadata'].forEach((e) => video.addEventListener(e, showTime));
  play.addEventListener('click', toggle);
  video.addEventListener('click', toggle);
  seek.addEventListener('input', () => {
    dragging = true;
    if (isFinite(video.duration)) video.currentTime = (Number(seek.value) / 1000) * video.duration;
    showTime();
  });
  seek.addEventListener('change', () => {
    dragging = false;
  });
  mute.addEventListener('click', () => {
    video.muted = !video.muted;
  });
  fullscreen.addEventListener('click', () => {
    // webkit-prefixed fullscreen APIs aren't in the DOM typings.
    const d = document as any;
    const b = box as any;
    const v = video as any;
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    } else if (b.requestFullscreen) {
      b.requestFullscreen();
    } else if (b.webkitRequestFullscreen) {
      b.webkitRequestFullscreen();
    } else if (v.webkitEnterFullscreen) {
      v.webkitEnterFullscreen(); // iOS: only the video can go fullscreen
    }
  });

  // Steps through the stream's sizes, smallest to largest and round again.
  quality.addEventListener('click', () => {
    const hls = video.immichHls;
    if (!hls || !hls.levels) return;
    const sizes = [...new Set(hls.levels.map((l) => Math.min(l.width, l.height)))].sort((a, b) => a - b);
    const current = hls.levels[hls.nextLevel > -1 ? hls.nextLevel : hls.currentLevel];
    const i = sizes.indexOf(current ? Math.min(current.width, current.height) : 0);
    video.immichSet!(sizes[(i + 1) % sizes.length]);
  });

  // Takes effect at the next segment (nextLevel), without flushing the buffer.
  video.immichSet = (target: number) => {
    const hls = video.immichHls;
    if (!hls || !hls.levels || !hls.levels.length) return;
    const k = pick(hls.levels, target);
    const level = hls.levels[k];
    hls.nextLevel = k;
    quality.hidden = false;
    quality.textContent = `${Math.min(level.width, level.height)}p`;
  };

  sync();
  showTime();
}

// Applies the toggle's tier to playing videos, posters and size estimates.
function applyTier() {
  const t = tier();
  document.querySelectorAll<ImmichVideo>('.immich-video video').forEach((v) => v.immichSet && v.immichSet(t));
  document.querySelectorAll<HTMLImageElement>('.immich-video img[data-thumb]').forEach((img) => {
    const src = t < 720 ? img.dataset.thumb : img.dataset.preview;
    if (img.getAttribute('src') !== src) img.src = src!;
  });
  document.querySelectorAll<HTMLElement>('.immich-video .iv-load').forEach((b) => {
    const small = b.querySelector('small');
    const size = b.dataset[`s${t}`];
    if (small) small.textContent = size ? `~${size}` : '';
  });
}

// Immich's segment requests can take over 10 s while it starts transcoding a
// level, and then answer 404 until the segment exists. hls.js times out at
// 10 s and never retries a 4xx; either way it gives up on the level.
function fragLoadPolicy(Hls: HlsStatic) {
  const policy = JSON.parse(JSON.stringify(Hls.DefaultConfig.fragLoadPolicy));
  policy.default.maxTimeToFirstByteMs = 30000;
  policy.default.errorRetry.shouldRetry = (config: any, count: number, _isTimeout: boolean, response: any, retry: boolean) =>
    retry || (!!response && response.code === 404 && count < config.maxNumRetry);
  return policy;
}

function load(button: HTMLElement) {
  const data = button.dataset;
  const box = button.parentNode as HTMLElement;
  const video: ImmichVideo = document.createElement('video');
  // Keep the poster's box so the layout doesn't jump when the video replaces it.
  const poster = button.querySelector('img:not([hidden])');
  const rect = poster && poster.getBoundingClientRect();
  if (rect && rect.width && rect.height) {
    video.style.aspectRatio = `${rect.width}/${rect.height}`;
    video.style.objectFit = 'contain';
  }
  video.playsInline = true;
  video.muted = data.muted === 'true';
  button.replaceWith(video);
  controls(box, video);
  const target = tier();

  const mp4 = () => {
    video.src = data.src!;
    video.play().catch(() => {});
  };

  // hls.js, not native HLS: Immich's variant playlists and segments need
  // ?slug=, which only a player that makes its own requests can add.
  const hlsPlay = () => {
    const Hls = window.Hls;
    if (!Hls || !Hls.isSupported()) return mp4();
    const hls = new Hls({
      fragLoadPolicy: fragLoadPolicy(Hls),
      xhrSetup(xhr: XMLHttpRequest, url: string) {
        if (url.indexOf('slug=') < 0) {
          xhr.open('GET', `${url}${url.indexOf('?') < 0 ? '?' : '&'}slug=${data.slug}`, true);
        }
      },
    });
    video.immichHls = hls;
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      hls.currentLevel = pick(hls.levels, target);
      video.immichSet!(target);
    });
    hls.on(Hls.Events.ERROR, (_: unknown, error: { fatal: boolean }) => {
      if (error.fatal) {
        hls.destroy();
        video.immichHls = null;
        mp4();
      }
    });
    hls.loadSource(data.hls!);
    hls.attachMedia(video);
    video.play().catch(() => {});
  };

  if (window.Hls) return hlsPlay();
  const script = document.createElement('script');
  script.src = params.hls;
  script.onload = hlsPlay;
  script.onerror = mp4;
  document.head.appendChild(script);
}

if (!window.immichVideo) {
  window.immichVideo = true;
  const init = () => {
    applyTier();
    new MutationObserver(applyTier).observe(document.body, {
      attributes: true,
      attributeFilter: ['data-image-mode'],
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('.immich-video .iv-load');
    if (b) load(b);
  });
}

export {};
