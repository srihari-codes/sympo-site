import { useCallback, useEffect, useRef, useState } from "react";
import { useExperienceStore } from "../../stores/experienceStore";
import { useModalStore } from "../../stores/useModalStore";
import { useAudioStore } from "../../stores/audioStore";

/*
 * Drop a looping track at public/media/theme.mp3 and it plays automatically.
 * Until that file exists the <audio> element errors, isTrackMissing flips, and
 * the overlay hides its music toggle rather than offering a dead button.
 */
const TRACK_SRC = "/media/theme.mp3";

const FULL_VOLUME = 0.45;
const DUCKED_VOLUME = 0.12; // while a modal is open, so text wins over music
const FADE_IN_MS = 2000;
const FADE_OUT_MS = 700;
const DUCK_MS = 400;

const AudioManager = () => {
  const isExperienceReady = useExperienceStore((s) => s.isExperienceReady);
  const isModalOpen = useModalStore((s) => s.isModalOpen);

  const isMuted = useAudioStore((s) => s.isMuted);
  const needsGesture = useAudioStore((s) => s.needsGesture);
  const setNeedsGesture = useAudioStore((s) => s.setNeedsGesture);
  const setIsTrackMissing = useAudioStore((s) => s.setIsTrackMissing);

  const [isPageVisible, setIsPageVisible] = useState(
    () => typeof document === "undefined" || !document.hidden
  );

  const audioRef = useRef(null);
  const fadeRef = useRef(null);
  const pauseRef = useRef(null);

  // Build the element once, outside of render.
  useEffect(() => {
    const audio = new Audio(TRACK_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;

    const handleError = () => {
      setIsTrackMissing(true);
      console.warn(
        `[AudioManager] No track at ${TRACK_SRC} — background music is off. ` +
          `Drop an .mp3 there to enable it.`
      );
    };
    audio.addEventListener("error", handleError);
    audioRef.current = audio;

    return () => {
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.removeAttribute("src");
      audioRef.current = null;
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
      if (pauseRef.current) clearTimeout(pauseRef.current);
    };
  }, [setIsTrackMissing]);

  const fadeTo = useCallback((target, duration) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeRef.current) cancelAnimationFrame(fadeRef.current);

    const from = audio.volume;
    const delta = target - from;
    if (duration <= 0 || delta === 0) {
      audio.volume = target;
      return;
    }

    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      audio.volume = Math.min(1, Math.max(0, from + delta * t));
      fadeRef.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    fadeRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    const handleVisibility = () => setIsPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const shouldPlay = isExperienceReady && !isMuted && isPageVisible;
  const targetVolume = isModalOpen ? DUCKED_VOLUME : FULL_VOLUME;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (pauseRef.current) {
      clearTimeout(pauseRef.current);
      pauseRef.current = null;
    }

    if (!shouldPlay) {
      fadeTo(0, FADE_OUT_MS);
      pauseRef.current = setTimeout(() => {
        audio.pause();
        pauseRef.current = null;
      }, FADE_OUT_MS);
      return;
    }

    if (!audio.paused) {
      fadeTo(targetVolume, DUCK_MS);
      return;
    }

    // "Enter World" is a real user gesture, so this normally succeeds. If the
    // browser still refuses, fall back to resuming on the next click anywhere.
    audio.volume = 0;
    audio
      .play()
      .then(() => {
        setNeedsGesture(false);
        fadeTo(targetVolume, FADE_IN_MS);
      })
      .catch(() => setNeedsGesture(true));
  }, [shouldPlay, targetVolume, fadeTo, setNeedsGesture]);

  useEffect(() => {
    if (!needsGesture || !shouldPlay) return;

    const retry = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio
        .play()
        .then(() => {
          setNeedsGesture(false);
          fadeTo(targetVolume, FADE_IN_MS);
        })
        .catch(() => {});
    };

    window.addEventListener("pointerdown", retry);
    return () => window.removeEventListener("pointerdown", retry);
  }, [needsGesture, shouldPlay, targetVolume, fadeTo, setNeedsGesture]);

  return null;
};

export default AudioManager;
