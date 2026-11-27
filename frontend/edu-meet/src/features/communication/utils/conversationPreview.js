function attachmentPreview(contentType) {
  if (contentType === "image/gif") return "Sent a GIF";
  if (contentType === "application/pdf") return "Sent a PDF";
  if (contentType.startsWith("image/")) return "Sent an image";
  if (contentType.startsWith("video/")) return "Sent a video";
  if (contentType.startsWith("audio/")) return "Sent an audio file";
  return "Sent a file";
}

export function isNewerPreview(time, id, { lastMessageId, lastMessageTime }) {
  // Mongo sorts by timestamp and then message ID. Adapted timestamps are UTC ISO strings.
  return Boolean(time && (
    !lastMessageTime ||
    time > lastMessageTime ||
    (time === lastMessageTime && (id ?? "") > (lastMessageId ?? ""))
  ));
}

export function reconcileConversationPreview(conversation, latest, currentUserId, members = []) {
  const useLatest = latest && isNewerPreview(latest.createdAt, latest.id, conversation);
  const senderId = useLatest ? latest.senderId : conversation.lastMessageSenderId;
  const summaryName = conversation.lastMessageSenderId === senderId
    ? conversation.lastMessageSenderName
    : null;
  const senderName = (useLatest || latest?.id === conversation.lastMessageId ? latest?.senderName : null)
    ?? summaryName
    ?? members.find((member) => member.id === senderId)?.name;
  const sender = senderId === currentUserId ? "You" : senderName?.trim().split(/\s+/, 1)[0];
  const contentType = useLatest ? latest.attachment?.contentType : conversation.lastMessageAttachmentContentType;
  const text = contentType ? attachmentPreview(contentType)
    : (useLatest ? latest.text : conversation.lastMessageText) ?? conversation.preview ?? "No messages yet.";

  return {
    ...conversation,
    preview: sender ? `${sender}: ${text}` : text,
    lastMessageTime: useLatest ? latest.createdAt : conversation.lastMessageTime,
  };
}
