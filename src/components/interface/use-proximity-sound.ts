"use client";

import { useEffect, useRef } from "react";
import { isSoundEnabled, soundPreferenceEvent } from "./sound-preference";

export function useProximitySound(expanded: boolean) {
  const sound = useRef<{
    approach: (strength: number) => void;
    stop: () => void;
    resolve: () => void;
  } | null>(null);

  useEffect(() => {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const rumble = context.createGain();
    const tone = context.createGain();
    const output = context.createGain();
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    noise.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = 100;
    rumble.gain.value = 0.3;
    tone.gain.value = 0.35;
    output.gain.value = 0;
    oscillator.frequency.value = 45;
    noise.connect(filter).connect(rumble).connect(output);
    oscillator.connect(tone).connect(output);
    output.connect(context.destination);
    oscillator.start();
    noise.start();
    let strength = 0;
    let pop: OscillatorNode | undefined;
    const stop = () => {
      output.gain.setTargetAtTime(0, context.currentTime, 0.035);
    };
    let disposed = false;
    const unlock = () => {
      if (!isSoundEnabled()) return;
      if (context.state === "suspended") void context.resume().catch((error: unknown) => {
        if (!disposed) console.error("Could not enable proximity audio", error);
      });
    };
    const silence = () => {
      strength = 0;
      stop();
      pop?.stop();
      pop = undefined;
    };
    const hide = () => { if (document.hidden) silence(); };
    sound.current = {
      stop,
      approach(value) {
        strength = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
        if (!isSoundEnabled() || context.state !== "running" || document.hidden) return;
        const now = context.currentTime;
        oscillator.frequency.setTargetAtTime(45 + 50 * strength, now, 0.045);
        filter.frequency.setTargetAtTime(100 + 180 * strength, now, 0.045);
        output.gain.setTargetAtTime(strength * 0.12, now, 0.045);
      },
      resolve() {
        stop();
        if (!isSoundEnabled() || strength <= 0 || context.state !== "running" || document.hidden) return;
        strength = 0;
        pop?.stop();
        const pulse = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;
        pulse.frequency.setValueAtTime(130, now);
        pulse.frequency.exponentialRampToValueAtTime(52, now + 0.16);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        pulse.connect(gain).connect(context.destination);
        pop = pulse;
        pulse.onended = () => {
          pulse.disconnect();
          gain.disconnect();
          if (pop === pulse) pop = undefined;
        };
        pulse.start(now);
        pulse.stop(now + 0.21);
      },
    };
    const ready = () => {
      if (context.state === "running") sound.current?.approach(strength);
    };
    context.addEventListener("statechange", ready);
    document.addEventListener("click", unlock, true);
    document.addEventListener("keydown", unlock, true);
    window.addEventListener(soundPreferenceEvent, unlock);
    unlock();
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("blur", silence);
    return () => {
      disposed = true;
      context.removeEventListener("statechange", ready);
      sound.current = null;
      document.removeEventListener("click", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      window.removeEventListener(soundPreferenceEvent, unlock);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("blur", silence);
      pop?.stop();
      oscillator.stop();
      noise.stop();
      oscillator.disconnect();
      noise.disconnect();
      filter.disconnect();
      rumble.disconnect();
      tone.disconnect();
      output.disconnect();
      void context.close();
    };
  }, []);

  useEffect(() => {
    if (expanded) sound.current?.resolve();
  }, [expanded]);

  return sound;
}
