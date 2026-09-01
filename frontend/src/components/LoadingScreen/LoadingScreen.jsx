import React, { useState, useEffect, useRef } from "react";
import "./LoadingScreen.scss";
import { useExperienceStore } from "../../stores/experienceStore.js";

const LoadingScreen = () => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);
  const [displayedProgress, setDisplayedProgress] = useState(0);
  const [hasCompletedAnimation, setHasCompletedAnimation] = useState(false); // New state
  const animationRef = useRef(null);

  const {
    setIsExperienceReady,
    isExperienceLoading,
    loadedChunks,
    totalChunks,
  } = useExperienceStore();

  const loadingProgress = Math.round((loadedChunks / totalChunks) * 100);

  // Smoothly animate the displayed progress number
  useEffect(() => {
    if (loadingProgress > displayedProgress || !hasCompletedAnimation) {
      const animate = () => {
        setDisplayedProgress((prev) => {
          const step = Math.ceil((loadingProgress - prev) * 0.1);
          const newValue = prev + step;

          if (newValue >= loadingProgress) {
            const finalValue = Math.min(loadingProgress, 100);
            if (finalValue === 100) {
              setHasCompletedAnimation(true);
            }
            return finalValue;
          }
          animationRef.current = requestAnimationFrame(animate);
          return newValue;
        });
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [loadingProgress, hasCompletedAnimation]);

  const handleReveal = () => {
    setIsRevealed(true);
    setIsExperienceReady();
  };

  const handleAnimationFinished = () => {
    setIsAnimationFinished(true);
  };

  if (isAnimationFinished) {
    return null;
  }

  // Only show button if BOTH conditions are met:
  // 1. Loading is technically complete (loadedChunks >= totalChunks)
  // 2. The animation has visually reached 100%
  // Without visual jump to 100 it'd show the enter button when it's done loading.
  // I want it to go to 100 THEN show the enter button not jump to it when it's done.
  const showEnterButton =
    !isExperienceLoading &&
    loadedChunks >= totalChunks &&
    hasCompletedAnimation &&
    !isRevealed;

  const progress = Math.min(displayedProgress, 100);
  const done = progress >= 100;

  return (
    <>
      <div className="loading-screen">
        <div
          className={`background-top-half ${isRevealed ? "revealed" : ""}`}
          onTransitionEnd={handleAnimationFinished}
        ></div>
        <div
          className={`background-bottom-half ${isRevealed ? "revealed" : ""}`}
        ></div>

        <div className="loading-screen-info-container">
          <div
            className={`instructions-container ${isRevealed ? "revealed" : ""}`}
          >
            Slowly Drag or Scroll to Navigate
          </div>

          {!isRevealed && (
            <div className={`warrior-scene ${done ? "is-done" : ""}`}>
              {/* huge faint HUD number behind the run */}
              <div className="warrior-scene__hud" aria-hidden="true">
                {progress}
              </div>

              <div className="warrior-track">
                <div
                  className="warrior-runner"
                  style={{ left: `calc(5% + ${progress * 0.9}%)` }}
                >
                  <span className="warrior-runner__streak" aria-hidden="true" />
                  <span className="warrior-runner__dust" aria-hidden="true" />

                  <svg
                    className="warrior"
                    viewBox="0 0 104 104"
                    role="img"
                    aria-label={`Loading ${progress}%`}
                  >
                    <path
                      className="warrior__cape"
                      d="M50 30 C 30 34, 14 52, 10 84 C 24 76, 34 72, 47 66 C 50 52, 51 40, 51 30 Z"
                    />
                    <path
                      className="warrior__leg warrior__leg--back"
                      d="M47 62 L34 70 L20 66"
                    />
                    <path
                      className="warrior__leg warrior__leg--front"
                      d="M47 62 L60 74 L55 94"
                    />
                    <path className="warrior__spine" d="M47 63 L55 30" />
                    <path
                      className="warrior__armfront"
                      d="M54 33 L70 40 L78 33"
                    />
                    <g className="warrior__arm">
                      <path d="M54 33 L40 20 L30 8" />
                      <path className="warrior__sword" d="M30 8 L17 -7" />
                      <path className="warrior__hilt" d="M25 4 L35 12" />
                    </g>
                    <circle className="warrior__head" cx="58" cy="20" r="9" />
                    <path
                      className="warrior__crest"
                      d="M55 12 C 48 2, 33 0, 23 7 C 35 9, 45 13, 49 21 Z"
                    />
                  </svg>
                </div>

                <div className="warrior-track__line" aria-hidden="true" />
                <div className="warrior-track__flash" aria-hidden="true" />
              </div>

              <div className="warrior-scene__label">
                {done ? "READY" : "LOADING"}
              </div>
            </div>
          )}

          {showEnterButton && (
            <button className="loading-screen-button" onClick={handleReveal}>
              &nbsp; &nbsp; &nbsp; Enter World &nbsp; &nbsp; &nbsp;
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default LoadingScreen;
