import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ChatHeader from "./components/ChatHeader.jsx";
import ChatMembersView from "./components/ChatMembersView.jsx";
import PinnedMessagesView from "./components/PinnedMessagesView.jsx";
import RenameGroupDialog from "./components/RenameGroupDialog.jsx";
import LeaveGroupDialog from "./components/LeaveGroupDialog.jsx";
import MessageInput from "./components/MessageInput.jsx";
import MessageList from "./components/MessageList.jsx";
import ConversationPanel from "./components/ConversationPanel.jsx";
import mockCommunicationProvider from "./data/mockCommunicationProvider.js";
import useConversations from "./hooks/useConversations.js";
import usePinnedMessages from "./hooks/usePinnedMessages.js";
import useChat from "./hooks/useChat.js";
import { attachmentUrl, getMembers } from "./services/communicationApi.js";
import { adaptMembers } from "./utils/communicationAdapters.js";
import "./styles/communication.css";

export default function CommunicationModule({ currentUserId }) {
  const live = Boolean(currentUserId);
  const [initialMockData] = useState(() => live ? null : mockCommunicationProvider.getInitialState());
  const [membersByConversationId, setMembersByConversationId] = useState({});
  const [memberError, setMemberError] = useState(null);
  const [renameConversationId, setRenameConversationId] = useState(null);
  const conversationState = useConversations({
    initialConversations: initialMockData?.conversations ?? [],
    currentUserId,
    membersByConversationId,
  });
  const {
    selectedConversation,
    selectedConversationId,
    activeChatPanelView,
    leaveGroupConversationId,
    handleConversationUnavailable,
  } = conversationState;
  const chatState = useChat({
    initialMessagesByConversationId: initialMockData?.messagesByConversationId ?? {},
    currentUserId,
    live,
    conversationId: selectedConversation?.id,
    onConversationUnavailable: handleConversationUnavailable,
  });
  const selectedMembers = live
    ? membersByConversationId[selectedConversationId] ?? []
    : initialMockData.members.filter((member) => member.conversationId === selectedConversationId);
  function withSender(message) {
    if (!live) return message;
    const sender = selectedMembers.find((member) => member.id === message.senderId);
    const senderName = message.direction === "outgoing" ? "You" : sender?.name ?? "Chat member";
    const attachment = message.attachment;
    return {
      ...message,
      senderName,
      avatarUrl: sender?.avatarUrl ?? null,
      ...(attachment && {
        attachment: {
          ...attachment,
          downloadUrl: attachmentUrl(message.conversationId, currentUserId, message.id),
          previewUrl: attachment.contentType.startsWith("image/")
            ? attachmentUrl(message.conversationId, currentUserId, message.id, true)
            : null,
        },
      }),
    };
  }

  const selectedMessages = (chatState.messagesByConversationId[selectedConversationId] ?? []).map(withSender);
  const conversations = conversationState.conversations.map((conversation) => {
    const messages = chatState.messagesByConversationId[conversation.id];
    const latest = messages?.at(-1);
    if (!latest || (live && latest.createdAt < conversation.lastMessageTime)) return conversation;
    const sender = latest.direction === "outgoing" ? "You" : latest.senderName;
    const preview = latest.text || latest.attachment?.name;
    return {
      ...conversation,
      preview: sender ? `${sender}: ${preview}` : preview,
      lastMessageTime: latest.createdAt,
    };
  });
  if (live) {
    conversations.sort((first, second) =>
      (second.lastMessageTime ?? "").localeCompare(first.lastMessageTime ?? ""),
    );
  }
  const lastSentMessageId = chatState.lastSentMessageId;
  const menuTriggerRef = useRef(null);
  const conversationSearchRef = useRef(null);
  const dialogCloseIntentRef = useRef(null);
  const selectedPinnedMessageIds =
    selectedConversation?.type === "group"
      ? initialMockData?.pinnedMessageIdsByConversationId[selectedConversation.id] ?? []
      : [];
  const selectedPinnedMessages = selectedPinnedMessageIds.flatMap(
    (messageId) => {
      const pinnedMessage = selectedMessages.find(
        (message) => message.id === messageId,
      );
      return pinnedMessage ? [pinnedMessage] : [];
    },
  );
  const showingMembers =
    activeChatPanelView === "members" &&
    selectedConversation?.type === "group";
  const showingPinnedMessages =
    activeChatPanelView === "pinned" &&
    selectedConversation?.type === "group";

  const liveGroupId = live && selectedConversation?.type === "group" ? selectedConversationId : null;
  const pins = usePinnedMessages(liveGroupId, currentUserId, showingPinnedMessages);
  const pinnedIds = new Set(pins.messages?.map((message) => message.id));

  function closeRename() {
    setRenameConversationId(null);
    requestAnimationFrame(() => menuTriggerRef.current?.focus());
  }

  const memberConversationId = selectedConversation?.id;
  useEffect(() => {
    if (!live || !memberConversationId) return;

    const controller = new AbortController();
    const { signal } = controller;
    getMembers(memberConversationId, currentUserId, { signal })
      .then((payload) => {
        if (signal.aborted) return;
        const members = adaptMembers(payload);
        setMemberError(null);
        setMembersByConversationId((current) => ({ ...current, [memberConversationId]: members }));
      })
      .catch((error) => {
        if (signal.aborted) return;
        if (error.status === 403 || error.status === 404) {
          handleConversationUnavailable(memberConversationId, error.message);
        } else {
          setMemberError({ conversationId: memberConversationId, message: error.message });
        }
      });
    return () => controller.abort();
  }, [live, currentUserId, memberConversationId, showingMembers, handleConversationUnavailable]);

  useLayoutEffect(() => {
    if (
      leaveGroupConversationId !== null ||
      dialogCloseIntentRef.current === null
    ) {
      return;
    }

    if (dialogCloseIntentRef.current === "cancel") {
      menuTriggerRef.current?.focus();
    } else {
      conversationSearchRef.current?.focus();
    }

    dialogCloseIntentRef.current = null;
  }, [leaveGroupConversationId]);

  function handleSendMessage(text) {
    return chatState.sendMessage(selectedConversationId, text);
  }

  function handleMenuAction(action, conversation) {
    if (action === "rename-group") {
      setRenameConversationId(conversation.id);
      return;
    }
    conversationState.handleMenuAction(action, conversation);
  }

  function handleSelectConversation(conversationId) {
    conversationState.handleSelectConversation(conversationId);
  }

  function handleCancelLeaveGroup() {
    dialogCloseIntentRef.current = "cancel";
    conversationState.handleCancelLeaveGroup();
  }

  function handleConfirmLeaveGroup() {
    dialogCloseIntentRef.current = "leave";
    conversationState.handleConfirmLeaveGroup();
  }

  return (
    <>
      <main
        className="communication-module"
        inert={leaveGroupConversationId !== null}
      >
        <section className="communication-conversations">
          <ConversationPanel
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            searchInputRef={conversationSearchRef}
            status={conversationState.isLoading ? "Loading conversations…" : null}
            error={conversationState.error}
          />
        </section>

        <section className="communication-chat" aria-label="Conversation">
          <div className="communication-chat-panel">
            {selectedConversation ? (
              <>
                <ChatHeader
                  key={selectedConversationId}
                  conversation={selectedConversation}
                  live={live}
                  onMenuAction={handleMenuAction}
                  view={
                    showingMembers
                      ? "members"
                      : showingPinnedMessages
                        ? "pinned"
                        : "chat"
                  }
                  onBackToChat={() =>
                    conversationState.setActiveChatPanelView("chat")
                  }
                  triggerRef={menuTriggerRef}
                />
                {showingMembers ? (
                  memberError?.conversationId === selectedConversationId ? <p role="alert">{memberError.message}</p> : (
                    <ChatMembersView
                      conversation={selectedConversation}
                      members={selectedMembers}
                    />
                  )
                ) : showingPinnedMessages ? (
                  <PinnedMessagesView
                    conversation={selectedConversation}
                    messages={live ? (pins.messages ?? []).map(withSender) : selectedPinnedMessages}
                    isLoading={live && !pins.messages && !pins.error}
                    error={pins.error}
                    isUpdating={Boolean(pins.pendingMessageId)}
                    onUnpin={live ? (messageId) => pins.updatePin(messageId, false) : undefined}
                  />
                ) : (
                  <>
                    {live && chatState.connectionState !== "open" && (
                      <p className="communication-chat-notice" role="status">
                        {["connecting", "disconnected"].includes(chatState.connectionState)
                          ? "Connecting to live chat…"
                          : "Chat disconnected. Refresh the page to reconnect."}
                      </p>
                    )}
                    {chatState.error && <p className="communication-chat-notice" role="alert">{chatState.error}</p>}
                    {chatState.historyError && <p className="communication-chat-notice" role="alert">{chatState.historyError}</p>}
                    {chatState.isLoading && chatState.connectionState === "open" && (
                      <p className="communication-chat-notice" role="status">Loading messages…</p>
                    )}
                    {pins.error && <p className="communication-chat-notice" role="alert">{pins.error}</p>}
                    <div className="communication-chat-content">
                      <MessageList
                        conversation={selectedConversation}
                        messages={selectedMessages}
                        lastSentMessageId={lastSentMessageId}
                        older={chatState.older}
                        onLoadOlder={chatState.loadOlderMessages}
                        pinnedIds={pinnedIds}
                        isUpdatingPin={Boolean(pins.pendingMessageId)}
                        onTogglePin={liveGroupId && pins.messages ? (id) => pins.updatePin(id, !pinnedIds.has(id)) : undefined}
                      />
                    </div>
                    <MessageInput
                      key={selectedConversationId}
                      onSendMessage={handleSendMessage}
                      onSendAttachment={live
                        ? (file, text) => chatState.sendAttachment(selectedConversationId, file, text)
                        : undefined}
                      sendDisabled={live && (chatState.connectionState !== "open" || chatState.isLoading || Boolean(chatState.historyError))}
                    />
                  </>
                )}
              </>
            ) : (
              <p
                className="communication-no-conversation-selected"
                role="status"
              >
                {conversations.length > 0
                  ? "No conversation selected."
                  : "No conversations available."}
              </p>
            )}
          </div>
        </section>
      </main>
      {renameConversationId !== null && renameConversationId === selectedConversation?.id && (
        <RenameGroupDialog
          name={selectedConversation.name}
          onClose={closeRename}
          onSave={(name) => conversationState.renameConversation(renameConversationId, name)}
        />
      )}
      {leaveGroupConversationId !== null && (
        <LeaveGroupDialog
          onCancel={handleCancelLeaveGroup}
          onConfirm={handleConfirmLeaveGroup}
        />
      )}
    </>
  );
}
