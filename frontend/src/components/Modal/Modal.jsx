import React, { useEffect, useRef, useState } from "react";
import "./Modal.scss";
import { useModalStore } from "../../stores/useModalStore";
import { modalContent } from "../../data/modalContent";
import TimelineJourney from "./TimelineJourney";
import FacultyShowcase from "./FacultyShowcase";
import TeamShowcase from "./TeamShowcase";
import Dashboard from "../Dashboard/Dashboard";

const Modal = () => {
  const { isModalOpen, modalID, closeModal, setModalID } = useModalStore();

  // "Register Now" anywhere drops the visitor into the Dashboard flow
  // (login → onboarding → event + payment → team) instead of an external site.
  const goToRegister = () => setModalID("dashboard");
  const isRegisterCta = (text) => /\bregister\b/i.test(text || "");
  const modalRef = useRef(null);
  const deckRef = useRef(null);
  const contentRef = useRef(null);
  // -1, not 0: the first item must render once in its pre-arrival state or it
  // simply appears instead of animating in.
  const [activeIndex, setActiveIndex] = useState(-1);

  const content = modalContent[modalID];
  const isEventDeck = Boolean(content?.eventList);
  const isTimeline = Boolean(content?.timeline);
  const isFaculty = Boolean(content?.faculty);
  // The Zyverse team runs the WebGL fragment transition; the faculty list
  // keeps the original showcase.
  const isTeam = isFaculty && modalID === "zyverse_team";
  // The user dashboard: login -> onboarding -> event -> team.
  const isDashboard = modalID === "dashboard";
  // Every modal is boxless now; this only distinguishes the ones that run
  // their own full-bleed scroll experience from the plain text ones.
  const isBare = isEventDeck || isTimeline || isFaculty || isDashboard;

  const handleClose = () => {
    closeModal();
  };

  const goToStop = (index) => {
    deckRef.current?.children[index]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape" && isModalOpen) {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isModalOpen, closeModal]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        closeModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isModalOpen, closeModal]);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.cursor = "auto";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isModalOpen]);

  /*
   * Drives the deck transitions: whichever event is centred in the viewport
   * gets .is-active, and CSS animates the poster and copy in from the side
   * that event sits on. Everything else animates back out, so scrolling reads
   * as one event handing off to the next.
   */
  useEffect(() => {
    if (!isModalOpen || !isEventDeck) return;

    const deck = deckRef.current;
    if (!deck) return;

    deck.scrollTop = 0;
    // The observer's first callback is asynchronous, so index 0 is promoted
    // after a paint has already happened at the inactive state.
    setActiveIndex(-1);

    const items = Array.from(deck.children);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveIndex(items.indexOf(entry.target));
          }
        });
      },
      { root: deck, threshold: 0.55 }
    );

    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [isModalOpen, isEventDeck, modalID]);

  if (!isModalOpen) return null;
  if (!isDashboard && !content) return null;

  const { title, link, linkText, paragraphs, image, eventList, timeline, faculty, finale } =
    content || {};

  /*
   * The poster is a single two-faced card rotated by activeIndex * 180deg, so
   * even indices land on the front face and odd indices on the back. Each face
   * holds the artwork for the most recent index of its own parity — that way
   * the face turning INTO view already carries the new poster, and the face
   * turning out is never repainted mid-flip.
   */
  const faceFront = eventList?.[activeIndex % 2 === 0 ? activeIndex : activeIndex - 1];
  const faceBack =
    eventList?.[activeIndex % 2 === 1 ? activeIndex : Math.max(0, activeIndex - 1)];

  // Each event carries a colour theme; expose it as CSS vars so the copy accent
  // and the frosted veil behind the text pick it up. The poster stage follows
  // whichever event is currently active.
  const themeVars = (theme) =>
    theme
      ? {
          "--ev-accent": theme.accent,
          "--ev-accent-rgb": theme.accentRgb,
          "--ev-frost-rgb": theme.frostRgb,
        }
      : undefined;
  const activeTheme = eventList?.[activeIndex]?.theme;

  return (
    <div
      className={`modal-overlay${isBare ? " modal-overlay--full" : ""}`}
    >
      <div
        className={`modal-container${isBare ? " modal-container--bare" : ""}`}
        ref={modalRef}
      >
        <button
          className="modal-back-button"
          onClick={handleClose}
          type="button"
          aria-label="Close"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 130 134"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M128.986 128.986L1 1" stroke="currentColor" />
            <path d="M128.986 128.986L1 1" stroke="currentColor" />
            <path d="M1 132.986L128.986 5" stroke="currentColor" />
          </svg>
        </button>

        {isDashboard ? (
          <Dashboard />
        ) : isEventDeck ? (
          <>
            <h2 className="modal-title modal-title--floating">{title}</h2>

            <div className="modal-deck">
              <div className="modal-deck__stage" aria-hidden="true">
                <div
                  className={`modal-deck__poster${
                    activeIndex % 2 === 1 ? " is-right" : ""
                  }`}
                  style={{ "--flip": `${activeIndex * 180}deg`, ...themeVars(activeTheme) }}
                >
                  <div className="modal-deck__face modal-deck__face--front">
                    <img src={faceFront?.image} alt="" />
                  </div>
                  <div className="modal-deck__face modal-deck__face--back">
                    <img src={faceBack?.image} alt="" />
                  </div>
                </div>
              </div>

              <div className="modal-deck__preload" aria-hidden="true">
                {eventList.map((event) => (
                  <img key={event.id} src={event.image} alt="" />
                ))}
              </div>

              <ol className="modal-events" ref={deckRef}>
                {eventList.map((event, index) => (
                  <li
                    className={`modal-event${
                      index === activeIndex ? " is-active" : ""
                    }`}
                    key={event.id}
                    style={themeVars(event.theme)}
                  >
                    <div className="modal-event__text">
                      <span className="modal-event__index">
                        {String(index + 1).padStart(2, "0")}
                        <span className="modal-event__count">
                          {` / ${String(eventList.length).padStart(2, "0")}`}
                        </span>
                      </span>

                      <h3 className="modal-event__name">{event.name}</h3>
                      <p className="modal-event__tagline">{event.tagline}</p>
                      <p className="modal-event__description">
                        {event.description}
                      </p>

                      {(event.contactName || event.contactPhone) && (
                        <div className="modal-event__contact">
                          <span className="modal-event__contact-label">Contact:</span>
                          {event.contactName && (
                            <span className="modal-event__contact-name">{event.contactName}</span>
                          )}
                          {event.contactPhone && (
                            <a
                              href={`tel:${event.contactPhone.replace(/[\[\]\s]/g, "")}`}
                              className="modal-event__contact-phone"
                            >
                              {event.contactPhone}
                            </a>
                          )}
                        </div>
                      )}

                      {isRegisterCta(event.registerText || linkText) ? (
                        <button
                          type="button"
                          className="modal-link"
                          onClick={goToRegister}
                        >
                          {event.registerText || linkText}
                        </button>
                      ) : (
                        <a
                          href={event.registerLink || link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="modal-link"
                        >
                          {event.registerText || linkText}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </>
        ) : isTimeline ? (
          <>
            <h2 className="modal-title modal-title--floating">{title}</h2>
            <TimelineJourney timeline={timeline} />
          </>
        ) : isFaculty ? (
          <>
            <h2 className="modal-title modal-title--floating">{title}</h2>
            {isTeam ? (
              <TeamShowcase faculty={faculty} />
            ) : (
              <FacultyShowcase
                faculty={faculty}
                finale={finale}
                link={link}
                linkText={linkText}
              />
            )}
          </>
        ) : (
          <div
            ref={contentRef}
            className={`modal-content${
              image ? " modal-content--with-image" : ""
            }`}
          >
            <h2 className="modal-title">{title}</h2>

            <div className="modal-layout">
              {image && (
                <div className="modal-image-wrap">
                  <img src={image} alt={title} className="modal-poster-image" />
                </div>
              )}

              <div className="modal-body">
                {paragraphs?.length > 0 && (
                  <div className="modal-paragraphs">
                    {paragraphs.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                )}

                {isRegisterCta(linkText) ? (
                  <button
                    type="button"
                    className="modal-link"
                    onClick={goToRegister}
                  >
                    {linkText}
                  </button>
                ) : (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="modal-link"
                  >
                    {linkText}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
