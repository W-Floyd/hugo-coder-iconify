// Globals the bundles rely on: Hugo's js.Build params, and the hls.js IIFE.
declare module '@params' {
  export const hls: string;
}

interface HlsLevel {
  width: number;
  height: number;
  bitrate: number;
}

interface HlsInstance {
  levels: HlsLevel[];
  nextLevel: number;
  currentLevel: number;
  on(event: string, cb: (...args: any[]) => void): void;
  destroy(): void;
  loadSource(src: string): void;
  attachMedia(video: HTMLVideoElement): void;
}

interface HlsStatic {
  new (config: object): HlsInstance;
  isSupported(): boolean;
  DefaultConfig: { fragLoadPolicy: any };
  Events: { MANIFEST_PARSED: string; ERROR: string };
}

interface ImmichVideo extends HTMLVideoElement {
  immichHls?: HlsInstance | null;
  immichSet?: (target: number) => void;
}

interface Window {
  Hls?: HlsStatic;
  immichVideo?: boolean;
}
