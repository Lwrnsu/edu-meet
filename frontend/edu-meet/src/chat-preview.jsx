import { createRoot } from "react-dom/client";
import CommunicationModule from "./features/communication/CommunicationModule.jsx";

const userId = new URLSearchParams(window.location.search).get("userId")?.trim();
const enabled = import.meta.env.DEV && import.meta.env.MODE === "chat-local";

createRoot(document.getElementById("root")).render(
  enabled && userId ? (
    <CommunicationModule currentUserId={userId} />
  ) : (
    <p role="status">
      {enabled ? "Add ?userId= with a seeded user ID to the preview URL." : "Start Vite in chat-local mode to open this preview."}
    </p>
  ),
);
