import { useEffect, useRef, useState } from "react";
import "./FacultyShowcase.scss";

/*
 * Faculty showcase — a horizontal depth rail travelling right to left.
 *
 * Deliberately unlike the other two experiences on the site: the events deck
 * turns one object on its Y axis in place, the timeline flies the camera
 * forward along Z. This travels sideways, and every member is a plane hung in
 * space on a rail that swings past the viewer. Panels ahead are angled away to
 * the right, the centre one squares up to face you, and passed ones angle off
 * to the left — so at any moment you can see where you have been and what is
 * coming, fanned out in depth.
 *
 * Vertical scroll drives horizontal travel, so there is never a horizontal
 * scrollbar and touch scrolling stays completely normal.
 *
 * Motion model: one rAF-coalesced handler writes --x on the rail and three
 * numbers per panel — --d (signed distance in panels, + still to come),
 * --a (its magnitude) and --v (a visibility ramp). Every transform is CSS
 * against those. Only transform and opacity animate, and the loop performs no
 * layout reads at all.
 */

const PortraitPlaceholder = () => (
  <svg className="fx-portrait__placeholder" viewBox="0 0 300 400" aria-hidden="true">
    <circle cx="150" cy="148" r="52" />
    <path d="M58 340c0-51 41-92 92-92s92 41 92 92" />
    <text x="150" y="386" textAnchor="middle">
      [PORTRAIT]
    </text>
  </svg>
);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
};

const Person = ({ person, index, total }) => (
  <div className="fx-panel__inner">
    <figure className="fx-portrait">
      <span className="fx-portrait__frame">
        {person.portrait ? (
          <img src={person.portrait} alt={person.name} loading="lazy" />
        ) : (
          <PortraitPlaceholder />
        )}
        {/* Light sweeping across the plate as it squares up. */}
        <span className="fx-portrait__sweep" aria-hidden="true" />
      </span>
    </figure>

    <div className="fx-info">
      <span className="fx-info__index">
        {String(index + 1).padStart(2, "0")}
        <span className="fx-info__count">
          {` / ${String(total).padStart(2, "0")}`}
        </span>
      </span>

      <h3 className="fx-info__name">{person.name}</h3>
      <p className="fx-info__role">{person.designation}</p>
      <p className="fx-info__dept">{person.department}</p>

      <ul className="fx-info__tags">
        {person.expertise.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <p className="fx-info__bio">{person.bio}</p>

      <dl className="fx-info__meta">
        <dt>Achievement</dt>
        <dd>{person.achievement}</dd>
      </dl>
    </div>
  </div>
);

/* Reduced motion: the same people in the same order, stacked and still. */
const FacultyStatic = ({ faculty, finale, link, linkText }) => (
  <div className="fx-static">
    <ol className="fx-static__list">
      {faculty.map((person, index) => (
        <li className="fx-static__item" key={person.id}>
          <span className="fx-static__portrait">
            {person.portrait ? (
              <img src={person.portrait} alt={person.name} loading="lazy" />
            ) : (
              <PortraitPlaceholder />
            )}
          </span>
          <div>
            <span className="fx-static__index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3>{person.name}</h3>
            <p className="fx-static__role">{person.designation}</p>
            <p className="fx-static__bio">{person.bio}</p>
          </div>
        </li>
      ))}
    </ol>

    {finale && (
      <div className="fx-static__finale">
        <h3>{finale.heading}</h3>
        <p>{finale.vision}</p>
        <p>{finale.mission}</p>
        <p>{finale.invitation}</p>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer">
            {linkText}
          </a>
        )}
      </div>
    )}
  </div>
);

const FacultyShowcase = ({ faculty, finale, link, linkText }) => {
  const reduced = usePrefersReducedMotion();
  const scrollRef = useRef(null);
  const railRef = useRef(null);
  const panelRefs = useRef([]);

  const total = faculty.length + (finale ? 1 : 0);

  useEffect(() => {
    if (reduced) return;

    const scroller = scrollRef.current;
    const rail = railRef.current;
    if (!scroller || !rail) return;

    const panels = panelRefs.current.filter(Boolean);
    const last = Math.max(1, panels.length - 1);
    let frame = null;
    // Start a little before the first panel, in panel units, so it swings in
    // on the same arc every later panel uses instead of being there already.
    let current = -0.6 / last;

    const readTarget = () => {
      const max = scroller.scrollHeight - scroller.clientHeight;
      return max > 0 ? clamp(scroller.scrollTop / max, 0, 1) : 0;
    };

    const paint = (progress) => {
      const x = progress * last;
      rail.style.setProperty("--x", x.toFixed(4));

      for (let i = 0; i < panels.length; i++) {
        // Positive while the panel is still to the right and coming toward
        // you, negative once it has swung off to the left.
        const d = clamp(i - x, -2.2, 2.2);
        const a = Math.abs(d);

        panels[i].style.setProperty("--d", d.toFixed(4));
        panels[i].style.setProperty("--a", a.toFixed(4));
        panels[i].style.setProperty("--v", clamp(1 - a / 0.88, 0, 1).toFixed(4));
        // Only the panel nearest the front is clickable, so an angled
        // neighbour can never swallow a click aimed at the current one.
        panels[i].style.pointerEvents = a < 0.5 ? "auto" : "none";
      }
    };

    // Eased travel: the rail keeps gliding for a moment after the wheel stops,
    // which is what separates this from a stack of panels snapping into place.
    const loop = () => {
      const target = readTarget();
      const diff = target - current;

      if (Math.abs(diff) < 0.00012) {
        current = target;
        paint(current);
        frame = null;
        return;
      }

      current += diff * 0.12;
      paint(current);
      frame = requestAnimationFrame(loop);
    };

    const request = () => {
      if (frame === null) frame = requestAnimationFrame(loop);
    };

    paint(current);
    // Kick the loop so panel 0 eases from its pre-arrival offset up to rest.
    request();

    scroller.addEventListener("scroll", request, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", request);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [reduced, faculty, finale]);

  if (reduced) {
    return (
      <FacultyStatic
        faculty={faculty}
        finale={finale}
        link={link}
        linkText={linkText}
      />
    );
  }

  return (
    <div
      className="fx"
      ref={scrollRef}
      tabIndex={0}
      role="region"
      aria-label="Faculty showcase — scroll to travel along the rail"
    >
      {/* The steps below are the travel budget: vertical distance converted
          into horizontal movement, one step per panel. */}
      <div className="fx__run">
        <div className="fx__stage">
          <div className="fx__rail" ref={railRef}>
            {faculty.map((person, index) => (
              <article
                className="fx-panel"
                key={person.id}
                style={{ "--i": index }}
                ref={(el) => {
                  panelRefs.current[index] = el;
                }}
              >
                <Person
                  person={person}
                  index={index}
                  total={faculty.length}
                />
              </article>
            ))}

            {finale && (
              <article
                className="fx-panel fx-panel--finale"
                style={{ "--i": faculty.length }}
                ref={(el) => {
                  panelRefs.current[faculty.length] = el;
                }}
              >
                <div className="fx-finale">
                  <h3 className="fx-finale__heading">{finale.heading}</h3>

                  <div className="fx-finale__cols">
                    <div className="fx-finale__col">
                      <span className="fx-finale__label">Vision</span>
                      <p>{finale.vision}</p>
                    </div>
                    <div className="fx-finale__col">
                      <span className="fx-finale__label">Mission</span>
                      <p>{finale.mission}</p>
                    </div>
                  </div>

                  <p className="fx-finale__invite">{finale.invitation}</p>

                  {link && (
                    <a
                      className="fx-finale__link"
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {linkText}
                    </a>
                  )}
                </div>
              </article>
            )}
          </div>
        </div>

        {/* One snap step per panel: a single scroll gesture advances exactly
            one member and locks there. */}
        {Array.from({ length: total }, (_, index) => (
          <div className="fx__step" key={`step-${index}`} />
        ))}
      </div>
    </div>
  );
};

export default FacultyShowcase;
