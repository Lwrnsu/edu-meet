import { useState } from "react";
import { createRoot } from "react-dom/client";
import AuthenticatedCommunication from "./features/communication/AuthenticatedCommunication.jsx";
import { getAuthBearerToken, login, logoutRequest } from "./api/auth.js";

export function ChatPreview() {
  const [accessToken, setAccessToken] = useState(getAuthBearerToken);
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function signIn(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSigningIn(true);
    setError("");
    try {
      await login(form.get("email"), form.get("password"), { baseUrl: "" });
      const token = getAuthBearerToken();
      if (!token) throw new Error("The school login did not return a session.");
      setAccessToken(token);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signOut() {
    await logoutRequest({ baseUrl: "" });
    setAccessToken(null);
  }

  if (accessToken) {
    return (
      <>
        <button type="button" onClick={signOut}>Sign out</button>
        <div style={{ height: "calc(100% - 32px)" }}>
          <AuthenticatedCommunication accessToken={accessToken} />
        </div>
      </>
    );
  }

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
