import { useRef, useState } from "react";
import sendMessageIcon from "../assets/send-message.png";
import { validateMessageText } from "../utils/communicationValidation.js";

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export default function MessageInput({ onSendMessage, onSendAttachment, sendDisabled = false }) {
  const picker = useRef(null);
  const uploading = useRef(false);
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  function selectFile(event) {
    const selected = event.target.files[0];
    event.target.value = "";
    if (!selected) return;
    if (!selected.size || selected.size > MAX_ATTACHMENT_BYTES) {
      setError("Choose a nonempty file of 5 MB or less.");
      return;
    }
    setError(null);
    setFile(selected);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (sendDisabled || uploading.current) return;

    const text = draft.trim();
    const validation = validateMessageText(text);
    if (!file) {
      if (validation.valid && onSendMessage(validation.text) !== false) {
        setDraft("");
        setError(null);
      }
      return;
    }

    if (text && !validation.valid) {
      setError("Caption must be at most 2000 characters.");
      return;
    }

    uploading.current = true;
    setIsUploading(true);
    setError(null);
    try {
      await onSendAttachment(file, text);
      setDraft("");
      setFile(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsUploading(false);
      uploading.current = false;
    }
  }

  return (
    <form
      className="communication-message-input-form"
      aria-label="Send a message"
      onSubmit={handleSubmit}
    >
      {(file || error) && (
        <div className="communication-composer-feedback">
          {file && (
            <div className="communication-selected-attachment">
              <span>{file.name}</span>
              <button className="communication-action-button" type="button" disabled={isUploading} onClick={() => {
                setFile(null);
                setError(null);
              }}>
                Remove file
              </button>
            </div>
          )}
          {error && <p role="alert">{error}</p>}
          {isUploading && <p role="status">Sending attachment…</p>}
        </div>
      )}
      <div className="communication-composer-row">
        {onSendAttachment && (
          <>
            <input type="file" ref={picker} hidden onChange={selectFile} />
            <button
              className="communication-attach-button"
              type="button"
              aria-label="Attach file"
              aria-busy={isUploading || undefined}
              disabled={sendDisabled || isUploading}
              onClick={() => picker.current.click()}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
              </svg>
            </button>
          </>
        )}
        <input
          className="communication-message-input"
          type="text"
          aria-label={file ? "Caption" : "Message"}
          placeholder={file ? "Add a caption…" : "Type a message..."}
          value={draft}
          readOnly={isUploading}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          className="communication-message-send-button"
          type="submit"
          aria-label={file ? "Send attachment" : "Send message"}
          disabled={sendDisabled || isUploading}
        >
          <img src={sendMessageIcon} alt="" />
        </button>
      </div>
    </form>
  );
}
