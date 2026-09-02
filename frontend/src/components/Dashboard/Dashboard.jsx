import React, { useEffect, useRef, useState } from "react";
import "./Dashboard.scss";
import { useAuthStore } from "../../stores/authStore";
import { api, assetUrl } from "../../lib/api";
import GoogleSignInButton from "./GoogleSignInButton";

/* Registration fee + payee bank details shown on the payment step. */
const REGISTRATION_FEE = "₹150";
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
  const steps = ["Sign in", "Profile", "Event", "Team"];
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

  const [form, setForm] = useState({
    first_name: user?.firstName || "",
    last_name: user?.lastName || "",
    phone_number: user?.phoneNumber || "",
    email: user?.email || "",
  });
  const [idCard, setIdCard] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.first_name || !form.last_name || !form.phone_number || !form.email) {
      setError("All fields are required.");
      return;
    }
    if (!idCard && !user?.idCardUrl) {
      setError("Please upload a photo of your college ID card.");
      return;
    }
    if (!profilePic && !user?.profilePicUrl) {
      setError("Please upload a profile picture.");
      return;
    }

    const fd = new FormData();
    fd.append("first_name", form.first_name);
    fd.append("last_name", form.last_name);
    fd.append("phone_number", form.phone_number);
    fd.append("email", form.email);
    if (idCard) fd.append("id_card", idCard);
    if (profilePic) fd.append("profile_pic", profilePic);

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
      <h3 className="dash-step__title">Complete your profile</h3>
      <p className="dash-step__lead">
        We need a few details before you can register for an event.
      </p>

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
          You may register for <strong>one</strong> event. Pick it here, then pay and upload
          your screenshot on the next step.
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
        Registering for <strong>{selectedEvent?.name || "your event"}</strong>. Pay the{" "}
        {REGISTRATION_FEE} registration fee to the account below, then upload a screenshot of
        the payment.
      </p>

      <div className="dash-card">
        <div className="dash-card__head">
          <h4>Payment details</h4>
          <span className="dash-badge">{REGISTRATION_FEE}</span>
        </div>
        <dl className="dash-paydetails">
          {PAYMENT_INFO.map((row) => (
            <div key={row.label} className="dash-paydetails__row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
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
   Step 4 — Team (create / join) + full dashboard home
   ══════════════════════════════════════════════════════════ */

const TeamPanel = () => {
  const team = useAuthStore((s) => s.team);
  const user = useAuthStore((s) => s.user);
  const refresh = useAuthStore((s) => s.refresh);

  const [mode, setMode] = useState("choose"); // choose | create | join
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = async (fn) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (team) {
    return (
      <div className="dash-card">
        <div className="dash-card__head">
          <h4>{team.name}</h4>
          <span className="dash-badge">
            {team.memberCount}/{team.maxMembers || 2} members
          </span>
        </div>

        <div className="dash-team-code">
          <span className="dash-team-code__label">Team code</span>
          <button
            type="button"
            className="dash-team-code__value"
            onClick={() => {
              navigator.clipboard?.writeText(team.code);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
            title="Click to copy"
          >
            {team.code} {copied ? "· copied" : "· copy"}
          </button>
        </div>

        <ul className="dash-members">
          {team.members.map((m) => (
            <li key={m.id}>
              {m.first_name} {m.last_name}
              {m.id === team.leaderId && <span className="dash-tag">leader</span>}
              {m.id === user?.id && <span className="dash-tag">you</span>}
            </li>
          ))}
        </ul>

        {error && <p className="dash-error">{error}</p>}

        <button
          type="button"
          className="dash-btn dash-btn--ghost"
          disabled={busy}
          onClick={() => run(() => api.leaveTeam())}
        >
          {team.isLeader ? "Disband team" : "Leave team"}
        </button>
      </div>
    );
  }

  return (
    <div className="dash-card">
      <h4>Your team</h4>
      <p className="dash-step__lead">
        Every event runs in teams of up to 2. Create a team and share the code, or join
        a teammate&apos;s team.
      </p>

      {mode === "choose" && (
        <div className="dash-choice">
          <button type="button" className="dash-btn" onClick={() => setMode("create")}>
            Create a team
          </button>
          <button
            type="button"
            className="dash-btn dash-btn--ghost"
            onClick={() => setMode("join")}
          >
            Join with a code
          </button>
        </div>
      )}

      {mode === "create" && (
        <form
          className="dash-inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api.createTeam(name.trim()));
          }}
        >
          <Field label="Team name">
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <div className="dash-choice">
            <button className="dash-btn" type="submit" disabled={busy || !name.trim()}>
              {busy ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              className="dash-btn dash-btn--ghost"
              onClick={() => setMode("choose")}
            >
              Back
            </button>
          </div>
        </form>
      )}

      {mode === "join" && (
        <form
          className="dash-inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api.joinTeam(code.trim().toUpperCase()));
          }}
        >
          <Field label="Team code" hint="6 characters, from your team leader">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
          </Field>
          <div className="dash-choice">
            <button className="dash-btn" type="submit" disabled={busy || code.trim().length < 6}>
              {busy ? "Joining…" : "Join"}
            </button>
            <button
              type="button"
              className="dash-btn dash-btn--ghost"
              onClick={() => setMode("choose")}
            >
              Back
            </button>
          </div>
        </form>
      )}

      {error && <p className="dash-error">{error}</p>}
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

      <TeamPanel />
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
