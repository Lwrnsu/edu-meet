import { useState } from "react";
import sendMessageIcon from "../assets/send-message.png";
import { validateMessageText } from "../utils/communicationValidation.js";

export default function MessageInput({ onSendMessage }) {
  const [draft, setDraft] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const validation = validateMessageText(draft);
    if (!validation.valid) {
      return;
    }

    if (onSendMessage(validation.text) === false) {
      return;
    }

    setDraft("");
  }

  return (
    <form
      className="communication-message-input-form"
      aria-label="Send a message"
      onSubmit={handleSubmit}
    >
      <input
        className="communication-message-input"
        type="text"
        aria-label="Message"
        placeholder="Type a message..."
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button
        className="communication-message-send-button"
        type="submit"
        aria-label="Send message"
      >
        <img src={sendMessageIcon} alt="" />
      </button>
    </form>
  );
}
