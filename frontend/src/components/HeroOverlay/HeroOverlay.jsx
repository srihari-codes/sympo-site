import React, { useState, useEffect } from "react";
import "./HeroOverlay.scss";
import { useExperienceStore } from "../../stores/experienceStore";
import { useModalStore } from "../../stores/useModalStore";
import { useAudioStore } from "../../stores/audioStore";

/* ── Countdown target date ── */
const TARGET_DATE = new Date("2026-10-15T09:00:00");

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
const IconAbout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v1M12 11v5" />
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
const IconCompass = () => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="24" cy="24" r="20" strokeWidth="0.8" />
    <polygon points="24,4 27,22 24,26 21,22" fill="currentColor" opacity="0.85" strokeWidth="0.5" />
    <polygon points="24,44 21,26 24,22 27,26" fill="currentColor" opacity="0.35" strokeWidth="0.5" />
    <polygon points="4,24 22,21 26,24 22,27" fill="currentColor" opacity="0.35" strokeWidth="0.5" />
    <polygon points="44,24 26,27 22,24 26,21" fill="currentColor" opacity="0.85" strokeWidth="0.5" />
    <circle cx="24" cy="24" r="2" fill="currentColor" strokeWidth="0" />
  </svg>
);

/* ── Countdown box ── */
const CdBox = ({ value, label }) => (
  <div className="ho-cd-box">
    <span className="ho-cd-box__val">{String(value).padStart(2, "0")}</span>
    <span className="ho-cd-box__lbl">{label}</span>
  </div>
);

/* ── Bottom nav items mapped to modal IDs ── */
const NAV_LINKS = [
  { id: "EVENTS", modalId: "events", Icon: IconEvents },
  { id: "SCHEDULE", modalId: "schedule", Icon: IconSchedule },
  { id: "TEAM", modalId: "zyverse_team", Icon: IconTeam },
  { id: "ABOUT", modalId: "about", Icon: IconAbout },
];

/* ── Dragon-Z component using official logo ── */
const DragonZ = () => (
  <img
    src="/media/favicon.svg"
    className="ho-dragon-z-img"
    alt="Z"
    style={{
      height: "clamp(38px, 6.2vw, 72px)",
      width: "auto",
      display: "inline-block",
      verticalAlign: "middle",
      marginRight: "-2px"
    }}
  />
);

/* ══════════════════════════════════════════
   Main HeroOverlay component
   ══════════════════════════════════════════ */
const HeroOverlay = ({ visible = true }) => {
  const time = useCountdown(TARGET_DATE);
  const { scrollProgress } = useExperienceStore();
  const { openModal, setModalID } = useModalStore();
  const { isMuted, isTrackMissing, toggleMute } = useAudioStore();

  const handleNavClick = (modalId) => {
    setModalID(modalId);
    openModal();
  };

  if (!visible) return null;

  // Layer 1 & 2 progress interpolation over scroll forward into house (0.00 -> 0.12)
  const p = Math.min(1, Math.max(0, scrollProgress / 0.12));

  // Layer 1: Background blur & fog (reduces blur 10px->0px, opacity 1->0)
  const blurPx = (1 - p) * 10;
  const fogOpacity = 1 - p;

  // Layer 2: Center Hero Content (fades out 1->0 when entering house, fades back 0->1 when scrolling out)
  const heroOpacity = 1 - p;
  const isHeroActive = heroOpacity > 0.01;

  return (
    <div className="ho-root">
      {/* ── Layer 1: Background fog overlay (fogs the 3D scene, blur clears on scroll into house) ── */}
      <div
        className="ho-bg-fog"
        style={{
          opacity: fogOpacity,
          backdropFilter: `blur(${blurPx}px) brightness(${0.75 + p * 0.25})`,
          WebkitBackdropFilter: `blur(${blurPx}px) brightness(${0.75 + p * 0.25})`,
        }}
      />

      {/* ── Layer 2: Center Hero Content (fades out on scroll in, restores on scroll back) ── */}
      <header
        className="ho-title-wrap"
        style={{
          opacity: heroOpacity,
          pointerEvents: isHeroActive ? "auto" : "none",
        }}
      >
        <h1 className="ho-title__zyverse">
          <span className="ho-dragon-z-mask" aria-label="Z" />
          <span>YVERSE</span>
        </h1>
        <div className="ho-title__2k26-row">
          <span className="ho-title__diamond">◆</span>
          <span className="ho-title__2k26">2K26</span>
          <span className="ho-title__diamond">◆</span>
        </div>
        <p className="ho-title__dept">DEPT. OF CYBERSECURITY</p>
        <p className="ho-title__college">SRM VALLIAMMAI ENGINEERING COLLEGE</p>
        {/* ── Countdown below college ── */}
        <div className="ho-countdown-wrap">
          <div className="ho-countdown-wrap__title">EVENT BEGINS IN</div>
          <div className="ho-countdown-wrap__row">
            <CdBox value={time.days} label="DAYS" />
            <CdBox value={time.hours} label="HRS" />
            <CdBox value={time.minutes} label="MINS" />
            <CdBox value={time.seconds} label="SECS" />
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

      {/* ── Layer 3: Bottom Navigation (PERMANENTLY FIXED — NEVER DISAPPEARS) ── */}
      <nav className="ho-bottom-nav">
        <div className="ho-bottom-panel">
          {NAV_LINKS.map(({ id, modalId, Icon }) => (
            <button
              key={id}
              className="ho-bottom-panel__item"
              onClick={() => handleNavClick(modalId)}
              type="button"
              aria-label={`Open ${id}`}
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
