import { useEffect, useState } from "react";
import { getAuthBearerToken } from "../../api/auth.js";
import CommunicationModule from "./CommunicationModule.jsx";
import { createCommunicationApi } from "./services/communicationApi.js";

export default function AuthenticatedCommunication({ accessToken = getAuthBearerToken() }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    const { signal } = controller;
    createCommunicationApi({ accessToken }).getCurrentAccount({ signal })
      .then((account) => {
        if (!signal.aborted) setSession({ accessToken, account });
      })
      .catch((error) => {
        if (!signal.aborted) {
          const message = [401, 403].includes(error.status)
            ? "Sign in again with your school account to use chat."
            : error.message;
          setSession({ accessToken, error: message });
        }
      });
    return () => controller.abort();
  }, [accessToken]);

  if (!accessToken) return <p role="status">Sign in with your school account to use chat.</p>;
  if (session?.accessToken !== accessToken) return <p role="status">Checking your chat session…</p>;
  if (session.error) return <p role="alert">{session.error}</p>;
  return <CommunicationModule key={session.account.userId} currentUserId={session.account.userId} accessToken={accessToken} />;
}
