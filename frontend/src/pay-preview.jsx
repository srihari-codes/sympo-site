/* TEMPORARY preview page — not part of the app, not linked from anywhere.
   The payment card normally sits behind Google sign-in -> onboarding ->
   event selection, so this renders the same markup against the same
   stylesheet to check the copy-button alignment. Delete this file and
   pay-preview.html when done. */
import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import "./components/Dashboard/Dashboard.scss";

const ROWS = [
  { label: "Account name", value: "VALLIAMMAI ENGINEERING COLLEGE" },
  { label: "Bank", value: "City Union Bank Ltd" },
  { label: "Account number", value: "117109000031450" },
  { label: "IFSC code", value: "CIUB0000117" },
];

const CopyButton = ({ value, label }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch { /* blocked */ }
  };
  return (
    <button type="button" className={`dash-copy${copied ? " is-copied" : ""}`}
      onClick={copy} title={copied ? "Copied!" : "Copy"} aria-label={`Copy ${label}`}>
      {copied ? (
        <svg viewBox="0 0 24 24" width="15" height="15"><path d="M20 6L9 17l-5-5" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      ) : (
        <svg viewBox="0 0 24 24" width="15" height="15">
          <rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
          <path d="M5 15V5a2 2 0 0 1 2-2h10" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )}
    </button>
  );
};

createRoot(document.getElementById("root")).render(
  <div style={{ minHeight: "100vh", background: "#0b0906", padding: "32px 20px" }}>
    <div className="dash" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="dash-card">
        <div className="dash-card__head">
          <h4>Payment details</h4>
          <span className="dash-badge">₹200</span>
        </div>
        <dl className="dash-paydetails">
          {ROWS.map((r) => (
            <div key={r.label} className="dash-paydetails__row">
              <dt>{r.label}</dt>
              <dd>
                <span className="dash-paydetails__value">{r.value}</span>
                <CopyButton value={r.value} label={r.label} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  </div>
);
