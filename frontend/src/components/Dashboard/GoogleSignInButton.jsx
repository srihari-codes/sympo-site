import React, { useEffect, useRef, useState } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * Renders the official Google Identity Services button. Waits for the GSI
 * script (loaded async from index.html), then hands the returned ID token
 * credential back to `onCredential`.
 */
const GoogleSignInButton = ({ onCredential, onError }) => {
  const holderRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) {
      onError?.("Missing VITE_GOOGLE_CLIENT_ID — set it in .env and restart the dev server.");
      return;
    }

    let cancelled = false;

    const tryInit = () => {
      if (cancelled) return;
      const google = window.google;
      if (!google?.accounts?.id) {
        window.setTimeout(tryInit, 150);
        return;
      }

      google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => {
          if (response?.credential) onCredential(response.credential);
          else onError?.("Google sign-in did not return a credential.");
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
    };
  }, [onCredential, onError]);

  return (
    <div className="gsi-button">
      <div ref={holderRef} />
      {!ready && <span className="gsi-button__loading">Loading Google Sign-In…</span>}
    </div>
  );
};

export default GoogleSignInButton;
