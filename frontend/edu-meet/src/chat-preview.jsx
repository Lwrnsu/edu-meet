import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import CommunicationModule from "./features/communication/CommunicationModule.jsx";
import { createCommunicationApi } from "./features/communication/services/communicationApi.js";

const TOKEN_KEY = "edu-meet-chat-preview-jwt";

export function ChatPreview() {
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    const { signal } = controller;
    createCommunicationApi({ accessToken }).getCurrentAccount({ signal })
      .then((account) => {
        if (!signal.aborted) setAccount(account);
      })
      .catch((error) => {
        if (signal.aborted) return;
        sessionStorage.removeItem(TOKEN_KEY);
        setAccessToken(null);
        setError(error.message);
      });

    return () => controller.abort();
  }, [accessToken]);

  async function signIn(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSigningIn(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.token) throw new Error(data.message || "Could not sign in.");
      sessionStorage.setItem(TOKEN_KEY, data.token);
      setAccessToken(data.token);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSigningIn(false);
    }
  }

  function signOut() {
    sessionStorage.removeItem(TOKEN_KEY);
    setAccount(null);
    setAccessToken(null);
  }

  if (account) {
    return (
      <>
        <button type="button" onClick={signOut}>Sign out of chat preview</button>
        <div style={{ height: "calc(100% - 32px)" }}>
          <CommunicationModule key={account.userId} currentUserId={account.userId} accessToken={accessToken} />
        </div>
      </>
    );
  }

  if (accessToken) return <p role="status">Checking your chat session…</p>;

  return (
    <form onSubmit={signIn}>
      <h1>Sign in to chat preview</h1>
      <p><label>Email <input type="email" name="email" autoComplete="username" required /></label></p>
      <p><label>Password <input type="password" name="password" autoComplete="current-password" required /></label></p>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isSigningIn}>{isSigningIn ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

const enabled = import.meta.env.DEV && import.meta.env.MODE === "chat-local";
createRoot(document.getElementById("root")).render(
  enabled ? <ChatPreview /> : <p role="status">Start Vite in chat-local mode to open this preview.</p>,
);
