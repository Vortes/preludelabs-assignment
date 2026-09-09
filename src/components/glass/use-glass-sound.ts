"use client";

import { useEffect, useRef } from "react";
import { isSoundEnabled, soundPreferenceEvent } from "../interface/sound-preference";

export function useGlassSound() {
  const player = useRef<{
    play: () => void;
    stop: () => void;
  } | null>(null);

  useEffect(() => {
    const context = new AudioContext();
    const abort = new AbortController();
    let buffer: AudioBuffer | undefined;
    let pending = false;
    let active: AudioBufferSourceNode | undefined;
    const stop = () => {
      pending = false;
      active?.stop();
      active = undefined;
    };
    const unlock = () => {
      if (!isSoundEnabled()) return;
      if (context.state === "suspended") void context.resume().catch((error: unknown) => {
        if (!abort.signal.aborted) console.error("Could not enable glass audio", error);
      });
    };
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("click", unlock, true);
    document.addEventListener("keydown", unlock, true);
    window.addEventListener(soundPreferenceEvent, unlock);
    unlock();
    document.addEventListener("visibilitychange", hide);
    void fetch("/audio/glass-slide-head.wav", { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Glass audio: ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .then((decoded) => {
        if (!abort.signal.aborted) { buffer = decoded; playReady(); }
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted) console.error("Could not load glass sound", error);
      });
    const playReady = () => {
        if (!isSoundEnabled() || !pending || !buffer || context.state !== "running" || document.hidden) return;
        pending = false;
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
    };
    context.addEventListener("statechange", playReady);
    player.current = {
      stop,
      play() {
        stop();
        pending = true;
        unlock();
        playReady();
      },
    };
    return () => {
      abort.abort();
      stop();
      player.current = null;
      context.removeEventListener("statechange", playReady);
      document.removeEventListener("click", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      window.removeEventListener(soundPreferenceEvent, unlock);
      document.removeEventListener("visibilitychange", hide);
      void context.close();
    };
  }, []);

  return player;
}
