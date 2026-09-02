import React, { useEffect, useRef, useState } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * Renders the official Google Identity Services button. Waits for the GSI
 * script (loaded async from index.html), then hands the returned ID token
 * credential back to `onCredential`.
 *
 * The init effect runs exactly once per mount. GSI keeps global state, so
 * calling initialize()/renderButton() again on every parent render makes it
 * log "initialize() is called multiple times" and spawn a fresh button iframe
 * each time. The latest callbacks are read through refs so a changing
 * `onCredential`/`onError` identity never retriggers init.
 */
const GoogleSignInButton = ({ onCredential, onError }) => {
  const holderRef = useRef(null);
  const [ready, setReady] = useState(false);

  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onCredentialRef.current = onCredential;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!CLIENT_ID) {
      onErrorRef.current?.(
        "Missing VITE_GOOGLE_CLIENT_ID — set it in .env and restart the dev server."
      );
      return;
    }

    let cancelled = false;
    let timer = null;

    const tryInit = () => {
      if (cancelled) return;
      const google = window.google;
      if (!google?.accounts?.id) {
        timer = window.setTimeout(tryInit, 150);
        return;
      }

      google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => {
          if (response?.credential) onCredentialRef.current?.(response.credential);
          else onErrorRef.current?.("Google sign-in did not return a credential.");
        },
      });

      if (holderRef.current) {
        holderRef.current.innerHTML = "";
        google.accounts.id.renderButton(holderRef.current, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "left",
        });
      }
      setReady(true);
    };

    tryInit();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="gsi-button">
      <div ref={holderRef} />
      {!ready && <span className="gsi-button__loading">Loading Google Sign-In…</span>}
    </div>
  );
};

export default GoogleSignInButton;
