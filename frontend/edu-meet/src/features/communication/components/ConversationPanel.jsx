import { useState } from "react";
import searchIcon from "../assets/search.png";
import ConversationItem from "./ConversationItem.jsx";

export default function ConversationPanel({
  conversations,
  selectedConversationId,
  onSelectConversation,
  searchInputRef,
  status,
  error,
  showArchived,
  onToggleArchived,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredConversations = conversations.filter((conversation) =>
    `${conversation.name} ${conversation.preview}`
      .toLowerCase()
      .includes(normalizedSearch),
  );

  return (
    <aside className="communication-panel" aria-label="Chats">
      <header className="communication-panel-header">
        <h1 className="communication-panel-title">{showArchived ? "Archive" : "Chats"}</h1>
      </header>
      <div className="communication-panel-content">
        <label className="communication-search">
          <img className="communication-search-icon" src={searchIcon} alt="" />
          <input
            aria-label="Search conversations"
            className="communication-search-input"
            type="search"
            placeholder="Search conversations..."
            ref={searchInputRef}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
        {onToggleArchived && (
          <button type="button" className="communication-archive-toggle" onClick={() => {
            setSearchTerm("");
            onToggleArchived();
          }}>
            {showArchived ? "Back to Chats" : "Archived Chats"}
          </button>
        )}
        {error && <p className="communication-chat-notice" role="alert">{error}</p>}
        {status && <p className="communication-chat-notice" role="status">{status}</p>}
        <ul className="communication-conversation-list">
          {showArchived && conversations.length === 0 && !normalizedSearch && (
            <li className="communication-conversation-empty" role="status">No archived chats.</li>
          )}
          {normalizedSearch && filteredConversations.length === 0 ? (
            <li className="communication-conversation-empty" role="status">
              No conversations found.
            </li>
          ) : (
            filteredConversations.map((conversation) => (
              <li
                className="communication-conversation-list-item"
                key={conversation.id}
              >
                <ConversationItem
                  conversation={conversation}
                  isSelected={conversation.id === selectedConversationId}
                  onSelect={onSelectConversation}
                />
              </li>
            ))
          )}
        </ul>
      </div>
    </aside>
  );
}
