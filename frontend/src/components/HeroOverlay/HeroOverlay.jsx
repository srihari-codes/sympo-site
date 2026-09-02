import React, { useState, useEffect } from "react";
import "./HeroOverlay.scss";
import { useExperienceStore } from "../../stores/experienceStore";
import { useModalStore } from "../../stores/useModalStore";
import { useAudioStore } from "../../stores/audioStore";
import HeroDragon from "../HeroDragon/HeroDragon";

/* ── Countdown target date ── */
const TARGET_DATE = new Date("2026-09-12T09:00:00");

function useCountdown(target) {
  const calc = () => {
    const diff = Math.max(0, target - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/* ── Inline SVG icons ── */
const IconEvents = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
  </svg>
);
const IconSchedule = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);
const IconTeam = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="3" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M2 20c0-3.314 3.134-6 7-6s7 2.686 7 6" />
    <path d="M17 14c2.21 0 4 1.567 4 3.5" />
  </svg>
);
const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="8" height="10" rx="1.5" />
    <rect x="3" y="16" width="8" height="5" rx="1.5" />
    <rect x="13" y="3" width="8" height="5" rx="1.5" />
    <rect x="13" y="11" width="8" height="10" rx="1.5" />
  </svg>
);

const IconMusicOn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l10-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="16" cy="16" r="3" />
  </svg>
);

const IconMusicOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l10-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="16" cy="16" r="3" />
    <path d="M3 3l18 18" />
  </svg>
);

/* ── Countdown cell ── */
const CdBox = ({ value, label }) => (
  <div className="ho-cd">
    <span className="ho-cd__val">{String(value).padStart(2, "0")}</span>
    <span className="ho-cd__lbl">{label}</span>
  </div>
);

/* ── Bottom nav items ──
   `target` is the scroll progress where that painting sits on the wall; a click
   flies the camera there before the section opens. */
const NAV_LINKS = [
  { id: "EVENTS", modalId: "events", target: 0.44, Icon: IconEvents },
  { id: "SCHEDULE", modalId: "schedule", target: 0.46, Icon: IconSchedule },
  { id: "TEAM", modalId: "zyverse_team", target: 0.5, Icon: IconTeam },
  { id: "DASHBOARD", modalId: "dashboard", target: 0.42, Icon: IconDashboard },
];

const WORDMARK = "YVERSE";

/* ══════════════════════════════════════════
   Main HeroOverlay component
   ══════════════════════════════════════════ */
const HeroOverlay = ({ visible = true }) => {
  const time = useCountdown(TARGET_DATE);
  const { scrollProgress, navRequest, requestNav, dragonLanded, setDragonLanded } =
    useExperienceStore();
  const { closeModal } = useModalStore();
  const { isMuted, isTrackMissing, toggleMute } = useAudioStore();

  const handleNavClick = (modalId, target) => {
    // Close whatever is open, then fly to the painting — the modal reopens on arrival.
    closeModal();
    requestNav(modalId, target);
  };

  // Safety net: once the hero is on screen, make sure the "Z" lights even if the
  // 3D dragon can't run (no WebGL, an error, or reduced motion).
  useEffect(() => {
    if (!visible || dragonLanded) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => setDragonLanded(true), reduce ? 200 : 5500);
    return () => window.clearTimeout(id);
  }, [visible, dragonLanded, setDragonLanded]);

  if (!visible) return null;

  // Layer 1 & 2 progress interpolation over scroll forward into house (0.00 -> 0.12)
  const p = Math.min(1, Math.max(0, scrollProgress / 0.12));
  const blurPx = (1 - p) * 10;
  const fogOpacity = 1 - p;
  const heroOpacity = 1 - p;
  const isHeroActive = heroOpacity > 0.01;

  return (
    <div className="ho-root">
      {/* ── Layer 1: fog over the 3D scene ── */}
      <div
        className="ho-bg-fog"
        style={{
          opacity: fogOpacity,
          backdropFilter: `blur(${blurPx}px) brightness(${0.75 + p * 0.25})`,
          WebkitBackdropFilter: `blur(${blurPx}px) brightness(${0.75 + p * 0.25})`,
        }}
      />

      {/* ── Cinematic vignette + drifting embers ── */}
      <div className="ho-vignette" aria-hidden="true" style={{ opacity: 0.35 + 0.65 * fogOpacity }} />
      <div className="ho-emberfield" aria-hidden="true" style={{ opacity: heroOpacity }}>
        <span /><span /><span /><span /><span /><span /><span />
      </div>

      {/* ── The 3D dragon entrance (flies in, roams, dissolves into the Z) ── */}
      {!dragonLanded && isHeroActive && <HeroDragon opacity={heroOpacity} />}

      {/* ── Layer 2: hero title ── */}
      <header
        className="ho-title-wrap"
        style={{
          opacity: heroOpacity,
          pointerEvents: isHeroActive ? "auto" : "none",
        }}
      >
        <p className="ho-eyebrow">
          <span className="ho-eyebrow__lead">
            <span className="ho-eyebrow__mark">✦</span>
            Dept. of Cyber Security
            <span className="ho-eyebrow__mark">✦</span>
          </span>
          <span className="ho-eyebrow__sub">SRM Valliammai Engineering College</span>
        </p>

        <div className={`ho-mark${dragonLanded ? " is-lit" : ""}`}>
          <span className="ho-glow" aria-hidden="true" />
          {/* The "Z" — hidden until the 3D dragon dissolves into it, then ignites */}
          <span className="ho-dragon" aria-hidden="true">
            <span className="ho-dragon__body" />
          </span>
          <span className="ho-land" aria-hidden="true" />
          <h1 className="ho-wordmark" aria-label="Zyverse 2K26">
            {WORDMARK.split("").map((c, i) => (
              <span key={i} className="ho-wordmark__ch" style={{ "--i": i }}>
                {c}
              </span>
            ))}
          </h1>
        </div>

        <div className="ho-year">
          <span className="ho-year__rule" />
          <span className="ho-year__text">2K26</span>
          <span className="ho-year__rule" />
        </div>

        <p className="ho-tagline">National Level Technical Symposium</p>

        <div className="ho-countdown">
          <div className="ho-countdown__title">The realm gathers in</div>
          <div className="ho-countdown__row">
            <CdBox value={time.days} label="Days" />
            <span className="ho-countdown__sep">◆</span>
            <CdBox value={time.hours} label="Hrs" />
            <span className="ho-countdown__sep">◆</span>
            <CdBox value={time.minutes} label="Min" />
            <span className="ho-countdown__sep">◆</span>
            <CdBox value={time.seconds} label="Sec" />
          </div>
        </div>
      </header>

      {/* ── Music toggle (hidden until a track actually exists) ── */}
      {!isTrackMissing && (
        <button
          className="ho-music-toggle"
          onClick={toggleMute}
          type="button"
          aria-pressed={!isMuted}
          aria-label={isMuted ? "Unmute music" : "Mute music"}
          title={isMuted ? "Unmute music" : "Mute music"}
        >
          {isMuted ? <IconMusicOff /> : <IconMusicOn />}
        </button>
      )}

      {/* ── Layer 3: bottom navigation (always fixed) ── */}
      <nav className="ho-bottom-nav">
        <div className={`ho-bottom-panel${navRequest ? " is-traveling" : ""}`}>
          {NAV_LINKS.map(({ id, modalId, target, Icon }) => (
            <button
              key={id}
              className={`ho-bottom-panel__item${
                navRequest?.modalId === modalId ? " is-active" : ""
              }`}
              onClick={() => handleNavClick(modalId, target)}
              type="button"
              disabled={Boolean(navRequest)}
              aria-label={`Go to ${id}`}
            >
              <span className="ho-bottom-panel__icon"><Icon /></span>
              <span className="ho-bottom-panel__label">{id}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default HeroOverlay;
