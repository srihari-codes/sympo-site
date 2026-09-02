import React, { useEffect, useRef, useState } from "react";
import "./Dashboard.scss";
import { useAuthStore } from "../../stores/authStore";
import { api, assetUrl } from "../../lib/api";
import GoogleSignInButton from "./GoogleSignInButton";

/* Registration fee by participation mode + payee bank details for payment. */
const FEE_BY_MODE = { solo: "₹150", team: "₹300" };
const feeFor = (mode) => FEE_BY_MODE[mode] || FEE_BY_MODE.solo;

/* The one-time solo/team choice made at onboarding. */
const MODE_OPTIONS = [
  {
    id: "solo",
    label: "Solo",
    fee: FEE_BY_MODE.solo,
    blurb: "Just you — one registration, one ID card.",
  },
  {
    id: "team",
    label: "Team of 2",
    fee: FEE_BY_MODE.team,
    blurb: "You and one teammate. You fill in both sets of details here.",
  },
];

const PAYMENT_INFO = [
  { label: "Account name", value: "VALLIAMMAI ENGINEERING COLLEGE" },
  { label: "Bank", value: "City Union Bank Ltd" },
  { label: "Account number", value: "117109000031450" },
  { label: "IFSC code", value: "CIUB0000117" },
  { label: "Branch", value: "Tambaram Branch (Extn Counter)" },
  { label: "MICR no", value: "600054011" },
];

/* ══════════════════════════════════════════════════════════
   Shared bits
   ══════════════════════════════════════════════════════════ */

/* Copy-to-clipboard button shown at the end of each payment detail. */
const CopyButton = ({ value, label }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for non-secure contexts / older mobile browsers.
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the value is still selectable by hand */
    }
  };

  return (
    <button
      type="button"
      className={`dash-copy${copied ? " is-copied" : ""}`}
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? "Copied!" : "Copy"}
    >
      {copied ? (
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
          <path
            d="M20 6L9 17l-5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
          <rect
            x="9"
            y="9"
            width="11"
            height="11"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
};

const Field = ({ label, children, hint }) => (
  <label className="dash-field">
    <span className="dash-field__label">{label}</span>
    {children}
    {hint && <span className="dash-field__hint">{hint}</span>}
  </label>
);

const FileField = ({ label, name, file, onChange, hint }) => (
  <div className="dash-field">
    <span className="dash-field__label">{label}</span>
    <div className="dash-file">
      <label className="dash-file__btn">
        {file ? "Change file" : "Choose image"}
        <input
          type="file"
          name={name}
          accept="image/*"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
          hidden
        />
      </label>
      <span className="dash-file__name">{file ? file.name : "No file selected"}</span>
    </div>
    {hint && <span className="dash-field__hint">{hint}</span>}
  </div>
);

const Stepper = ({ step }) => {
  const steps = ["Sign in", "Profile", "Register", "Done"];
  return (
    <ol className="dash-stepper">
      {steps.map((label, i) => (
        <li
          key={label}
          className={`dash-stepper__item${i < step ? " is-done" : ""}${
            i === step ? " is-current" : ""
          }`}
        >
          <span className="dash-stepper__dot">{i < step ? "✓" : i + 1}</span>
          <span className="dash-stepper__label">{label}</span>
        </li>
      ))}
    </ol>
  );
};

/* ══════════════════════════════════════════════════════════
   Step 1 — Login
   ══════════════════════════════════════════════════════════ */

const LoginStep = () => {
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleCredential = async (credential) => {
    setBusy(true);
    setError(null);
    try {
      await loginWithGoogle(credential);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="dash-step dash-step--center">
      <h3 className="dash-step__title">Enter the Realm</h3>
      <p className="dash-step__lead">
        Sign in with your Google account to register for events and manage your team.
      </p>

      {busy ? (
        <p className="dash-note">Signing you in…</p>
      ) : (
        <GoogleSignInButton onCredential={handleCredential} onError={setError} />
      )}

      {error && <p className="dash-error">{error}</p>}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   Step 2 — Onboarding
   ══════════════════════════════════════════════════════════ */

const OnboardingStep = () => {
  const user = useAuthStore((s) => s.user);
  const refresh = useAuthStore((s) => s.refresh);

  // Only settable once. In practice this screen only renders pre-onboarding, so
  // user.mode is null here — the guard just keeps a re-submit honest.
  const modeLocked = Boolean(user?.mode);
  const [mode, setMode] = useState(user?.mode || null);

  const [form, setForm] = useState({
    first_name: user?.firstName || "",
    last_name: user?.lastName || "",
    phone_number: user?.phoneNumber || "",
    email: user?.email || "",
  });
  const [mate, setMate] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
  });
  const [idCard, setIdCard] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [mateIdCard, setMateIdCard] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setMateField = (k) => (e) => setMate((m) => ({ ...m, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!mode) return setError("Choose solo or team to continue.");
    if (!form.first_name || !form.last_name || !form.phone_number || !form.email) {
      return setError("All of your details are required.");
    }
    if (!idCard && !user?.idCardUrl) {
      return setError("Please upload a photo of your college ID card.");
    }
    if (!profilePic && !user?.profilePicUrl) {
      return setError("Please upload a profile picture.");
    }
    if (mode === "team") {
      if (!mate.first_name || !mate.last_name || !mate.phone_number || !mate.email) {
        return setError("Your teammate's details are all required.");
      }
      if (!mateIdCard) {
        return setError("Please upload a photo of your teammate's college ID card.");
      }
    }

    const fd = new FormData();
    fd.append("mode", mode);
    fd.append("first_name", form.first_name);
    fd.append("last_name", form.last_name);
    fd.append("phone_number", form.phone_number);
    fd.append("email", form.email);
    if (idCard) fd.append("id_card", idCard);
    if (profilePic) fd.append("profile_pic", profilePic);

    if (mode === "team") {
      fd.append("teammate_first_name", mate.first_name);
      fd.append("teammate_last_name", mate.last_name);
      fd.append("teammate_phone_number", mate.phone_number);
      fd.append("teammate_email", mate.email);
      if (mateIdCard) fd.append("teammate_id_card", mateIdCard);
    }

    setBusy(true);
    try {
      await api.onboarding(fd);
      await refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="dash-step" onSubmit={submit}>
      <h3 className="dash-step__title">Complete your registration</h3>
      <p className="dash-step__lead">
        First, choose how you&apos;re taking part. This is set once — solo and team
        can&apos;t be switched afterwards.
      </p>

      <div className="dash-modes">
        {MODE_OPTIONS.map((opt) => (
          <button
            type="button"
            key={opt.id}
            className={`dash-mode${mode === opt.id ? " is-selected" : ""}`}
            onClick={() => !modeLocked && setMode(opt.id)}
            disabled={modeLocked && mode !== opt.id}
            aria-pressed={mode === opt.id}
          >
            <span className="dash-mode__top">
              <span className="dash-mode__label">{opt.label}</span>
              <span className="dash-mode__fee">{opt.fee}</span>
            </span>
            <span className="dash-mode__blurb">{opt.blurb}</span>
          </button>
        ))}
      </div>

      {mode && (
        <p className="dash-warn">
          Registering <strong>{mode === "team" ? "as a team of 2" : "solo"}</strong> — the fee
          will be <strong>{feeFor(mode)}</strong>, and this choice can&apos;t be changed later.
        </p>
      )}

      <h4 className="dash-subhead">Your details</h4>

      <div className="dash-grid-2">
        <Field label="First name">
          <input value={form.first_name} onChange={set("first_name")} required />
        </Field>
        <Field label="Last name">
          <input value={form.last_name} onChange={set("last_name")} required />
        </Field>
      </div>

      <div className="dash-grid-2">
        <Field label="Phone number">
          <input
            value={form.phone_number}
            onChange={set("phone_number")}
            inputMode="tel"
            required
          />
        </Field>
        <Field label="Email">
          <input value={form.email} onChange={set("email")} type="email" required />
        </Field>
      </div>

      <div className="dash-grid-2">
        <FileField
          label="College ID card"
          name="id_card"
          file={idCard}
          onChange={setIdCard}
          hint={user?.idCardUrl && !idCard ? "Already uploaded — choose a file to replace it." : undefined}
        />
        <FileField
          label="Profile picture"
          name="profile_pic"
          file={profilePic}
          onChange={setProfilePic}
          hint={user?.profilePicUrl && !profilePic ? "Already uploaded — choose a file to replace it." : undefined}
        />
      </div>

      {mode === "team" && (
        <>
          <h4 className="dash-subhead">Your teammate&apos;s details</h4>
          <p className="dash-field__hint">
            Your teammate doesn&apos;t sign in anywhere — enter everything for them here.
          </p>

          <div className="dash-grid-2">
            <Field label="Teammate first name">
              <input value={mate.first_name} onChange={setMateField("first_name")} required />
            </Field>
            <Field label="Teammate last name">
              <input value={mate.last_name} onChange={setMateField("last_name")} required />
            </Field>
          </div>

          <div className="dash-grid-2">
            <Field label="Teammate phone number">
              <input
                value={mate.phone_number}
                onChange={setMateField("phone_number")}
                inputMode="tel"
                required
              />
            </Field>
            <Field label="Teammate email">
              <input
                value={mate.email}
                onChange={setMateField("email")}
                type="email"
                required
              />
            </Field>
          </div>

          <FileField
            label="Teammate's college ID card"
            name="teammate_id_card"
            file={mateIdCard}
            onChange={setMateIdCard}
          />
        </>
      )}

      {error && <p className="dash-error">{error}</p>}

      <button className="dash-btn" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save & continue"}
      </button>
    </form>
  );
};

/* ══════════════════════════════════════════════════════════
   Step 3 — Event registration
   ══════════════════════════════════════════════════════════ */

const RegisterStep = () => {
  const refresh = useAuthStore((s) => s.refresh);
  const mode = useAuthStore((s) => s.user?.mode);
  const fee = feeFor(mode);
  const [events, setEvents] = useState([]);
  const [phase, setPhase] = useState("event"); // "event" -> "payment"
  const [eventId, setEventId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listEvents()
      .then((data) => setEvents(data.events || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedEvent = events.find((ev) => ev.id === eventId);

  const goToPayment = (e) => {
    e.preventDefault();
    setError(null);
    if (!eventId) return setError("Select an event to continue.");
    setPhase("payment");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!eventId) return setError("Select an event to register for.");

    const txnId = transactionId.trim();
    if (!txnId) {
      return setError("Enter the Reference ID / Transaction ID shown on your payment receipt.");
    }
    if (txnId.length < 6) {
      return setError("That Reference ID looks too short — copy it exactly from your bank receipt.");
    }
    if (!screenshot) return setError("Upload your payment screenshot to confirm registration.");

    const fd = new FormData();
    fd.append("event_id", eventId);
    fd.append("transaction_id", txnId);
    fd.append("payment_screenshot", screenshot);

    setBusy(true);
    try {
      await api.register(fd);
      await refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (loading) return <p className="dash-note">Loading events…</p>;

  /* ── Sub-step 1: pick an event ── */
  if (phase === "event") {
    return (
      <form className="dash-step" onSubmit={goToPayment}>
        <h3 className="dash-step__title">Choose your event</h3>
        <p className="dash-step__lead">
          You&apos;re registered {mode === "team" ? "as a team of 2" : "solo"} — the fee is{" "}
          <strong>{fee}</strong>. You may register for <strong>one</strong> event. Pick it
          here, then pay and upload your screenshot on the next step.
        </p>

        <div className="dash-events">
          {events.map((ev) => (
            <label
              key={ev.id}
              className={`dash-event${eventId === ev.id ? " is-selected" : ""}`}
            >
              <input
                type="radio"
                name="event"
                value={ev.id}
                checked={eventId === ev.id}
                onChange={() => setEventId(ev.id)}
              />
              <span className="dash-event__name">{ev.name}</span>
              <span className="dash-event__tag">{ev.tagline}</span>
            </label>
          ))}
        </div>

        {error && <p className="dash-error">{error}</p>}

        <button className="dash-btn" type="submit" disabled={!eventId}>
          Next — payment
        </button>
      </form>
    );
  }

  /* ── Sub-step 2: pay + upload screenshot ── */
  return (
    <form className="dash-step" onSubmit={submit}>
      <h3 className="dash-step__title">Payment</h3>
      <p className="dash-step__lead">
        Registering for <strong>{selectedEvent?.name || "your event"}</strong>{" "}
        <strong>{mode === "team" ? "as a team of 2" : "solo"}</strong>. Pay the {fee}{" "}
        registration fee to the account below, then upload a screenshot of the payment.
      </p>

      <div className="dash-card">
        <div className="dash-card__head">
          <h4>Payment details</h4>
          <span className="dash-badge">{fee}</span>
        </div>
        <dl className="dash-paydetails">
          {PAYMENT_INFO.map((row) => (
            <div key={row.label} className="dash-paydetails__row">
              <dt>{row.label}</dt>
              <dd>
                <span className="dash-paydetails__value">{row.value}</span>
                <CopyButton value={row.value} label={row.label} />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <Field
        label="Reference ID / Transaction ID *"
        hint="The UTR / reference number your bank shows for this transfer. It must match the screenshot — organisers verify the two against the bank statement."
      >
        <input
          type="text"
          name="transaction_id"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          placeholder="e.g. CIUB431299001234"
          autoComplete="off"
          maxLength={40}
          required
        />
      </Field>

      <FileField
        label="Payment screenshot *"
        name="payment_screenshot"
        file={screenshot}
        onChange={setScreenshot}
        hint="Required. Clear screenshot showing the amount, date and reference number."
      />

      {error && <p className="dash-error">{error}</p>}

      <div className="dash-choice">
        <button
          type="button"
          className="dash-btn dash-btn--ghost"
          onClick={() => {
            setError(null);
            setPhase("event");
          }}
          disabled={busy}
        >
          Back
        </button>
        <button
          className="dash-btn"
          type="submit"
          disabled={busy || !screenshot || !transactionId.trim()}
        >
          {busy ? "Submitting…" : "Submit registration"}
        </button>
      </div>
    </form>
  );
};

/* ══════════════════════════════════════════════════════════
   Step 4 — full dashboard home
   ══════════════════════════════════════════════════════════ */

/* Read-only. The teammate was entered at onboarding and cannot be changed from
   here — there are no team codes, invites or self-service edits any more. */
const TeammateCard = () => {
  const teammate = useAuthStore((s) => s.teammate);
  if (!teammate) return null;

  return (
    <div className="dash-card">
      <div className="dash-card__head">
        <h4>Your teammate</h4>
        <span className="dash-badge">Team of 2</span>
      </div>
      <dl className="dash-paydetails">
        <div className="dash-paydetails__row">
          <dt>Name</dt>
          <dd>{teammate.firstName} {teammate.lastName}</dd>
        </div>
        <div className="dash-paydetails__row">
          <dt>Phone</dt>
          <dd>{teammate.phoneNumber}</dd>
        </div>
        <div className="dash-paydetails__row">
          <dt>Email</dt>
          <dd>{teammate.email}</dd>
        </div>
      </dl>
      <p className="dash-field__hint">
        Locked in at registration. Contact the organisers if anything here is wrong.
      </p>
    </div>
  );
};

const DashboardHome = () => {
  const user = useAuthStore((s) => s.user);
  const registration = useAuthStore((s) => s.registration);
  const logout = useAuthStore((s) => s.logout);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.listEvents().then((d) => setEvents(d.events || [])).catch(() => {});
  }, []);

  const eventName =
    events.find((e) => e.id === registration?.eventId)?.name || registration?.eventId;

  return (
    <div className="dash-step">
      <div className="dash-profile">
        {user?.profilePicUrl && (
          <img
            className="dash-profile__pic"
            src={assetUrl(user.profilePicUrl)}
            alt=""
          />
        )}
        <div>
          <h3 className="dash-step__title">
            {user?.firstName} {user?.lastName}
          </h3>
          <p className="dash-profile__meta">
            {user?.email}
            {user?.phoneNumber ? ` · ${user.phoneNumber}` : ""}
            {user?.mode ? ` · ${user.mode === "team" ? "Team of 2" : "Solo"}` : ""}
          </p>
        </div>
        <button type="button" className="dash-btn dash-btn--ghost dash-btn--sm" onClick={logout}>
          Sign out
        </button>
      </div>

      <div className="dash-card">
        <div className="dash-card__head">
          <h4>Registered event</h4>
          <span className={`dash-badge dash-badge--${registration?.status || "pending"}`}>
            {registration?.status || "pending"}
          </span>
        </div>
        <p className="dash-event-line">{eventName}</p>
        {registration?.transactionId && (
          <dl className="dash-paydetails">
            <div className="dash-paydetails__row">
              <dt>Reference ID</dt>
              <dd>{registration.transactionId}</dd>
            </div>
          </dl>
        )}
        <p className="dash-field__hint">
          Your payment reference and screenshot are under review by the organisers.
        </p>
      </div>

      {user?.mode === "team" ? (
        <TeammateCard />
      ) : (
        <div className="dash-card">
          <h4>Solo registration</h4>
          <p className="dash-step__lead">You&apos;re taking part on your own.</p>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   Root
   ══════════════════════════════════════════════════════════ */

const Dashboard = () => {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const registration = useAuthStore((s) => s.registration);
  const init = useAuthStore((s) => s.init);
  const initedRef = useRef(false);

  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    if (status === "idle") init();
  }, [status, init]);

  let step = 0;
  let body;

  if (status === "idle" || status === "loading") {
    body = <p className="dash-note">Loading…</p>;
  } else if (!user) {
    step = 0;
    body = <LoginStep />;
  } else if (!user.isOnboarded) {
    step = 1;
    body = <OnboardingStep />;
  } else if (!registration) {
    step = 2;
    body = <RegisterStep />;
  } else {
    step = 3;
    body = <DashboardHome />;
  }

  return (
    <div className="dash-root">
      <div className="dash-inner">
        <h2 className="dash-heading">Dashboard</h2>
        {user && <Stepper step={step} />}
        {body}
      </div>
    </div>
  );
};

export default Dashboard;
