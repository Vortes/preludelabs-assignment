"use client";

import { useEffect, useRef } from "react";
import { saveSoundPreference, hasSoundPreference } from "./sound-preference";
import styles from "./sound-welcome.module.css";

export function SoundWelcome() {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!hasSoundPreference()) element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="sound-title" aria-describedby="sound-description" onCancel={() => saveSoundPreference(false)}>
      <h2 id="sound-title">Turn on your speakers</h2>
      <p id="sound-description">Enable sound for subtle feedback as you explore the glass.</p>
      <div className={styles.actions}>
        <button type="button" className={styles.enable} onClick={() => {
          saveSoundPreference(true);
          dialog.current?.close();
        }}>Enable sound</button>
        <button type="button" onClick={() => { saveSoundPreference(false); dialog.current?.close(); }}>Continue muted</button>
      </div>
    </dialog>
  );
}
