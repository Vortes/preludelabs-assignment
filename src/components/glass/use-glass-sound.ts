"use client";

import { useEffect, useRef } from "react";

export function useGlassSound() {
  const player = useRef<{
    play: () => void;
    stop: () => void;
  } | null>(null);

  useEffect(() => {
    const context = new AudioContext();
    const abort = new AbortController();
    let buffer: AudioBuffer | undefined;
    let active: AudioBufferSourceNode | undefined;
    const stop = () => {
      active?.stop();
      active = undefined;
    };
    const unlock = () => {
      if (context.state === "suspended") void context.resume();
    };
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("visibilitychange", hide);
    void fetch("/audio/glass-slide-head.wav", { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Glass audio: ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .then((decoded) => { if (!abort.signal.aborted) buffer = decoded; })
      .catch((error: unknown) => {
        if (!abort.signal.aborted) console.error("Could not load glass sound", error);
      });
    player.current = {
      stop,
      play() {
        stop();
        if (!buffer || context.state !== "running" || document.hidden) return;
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.playbackRate.value = 1;
        const duration = buffer.duration;
        source.connect(gain).connect(context.destination);
        const now = context.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + duration * 0.2);
        gain.gain.setValueAtTime(0.3, now + duration * 0.65);
        gain.gain.linearRampToValueAtTime(0, now + duration);
        active = source;
        source.onended = () => {
          source.disconnect();
          gain.disconnect();
          if (active === source) active = undefined;
        };
        source.start();
      },
    };
    return () => {
      abort.abort();
      stop();
      player.current = null;
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("visibilitychange", hide);
      void context.close();
    };
  }, []);

  return player;
}
