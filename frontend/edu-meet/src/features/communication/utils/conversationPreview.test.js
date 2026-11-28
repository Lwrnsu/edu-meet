import assert from "node:assert/strict";
import { test } from "node:test";
import { adaptConversation, adaptMessage, mergeMessages } from "./communicationAdapters.js";
import { reconcileConversationPreview } from "./conversationPreview.js";

const timestamp = "2026-11-27T05:00:00.000Z";
const summary = adaptConversation({
  id: "chat",
  type: "PRIVATE",
  participantIds: ["php:1", "php:2"],
  lastMessageId: "002",
  lastMessageTime: timestamp,
  lastMessageText: "Hello",
  lastMessageSenderId: "php:2",
  lastMessageSenderName: "Alex Rivera",
});

function message(id, details = {}) {
  return adaptMessage({
    id,
    conversationId: "chat",
    senderId: "php:2",
    text: "New message",
    timestamp,
    ...details,
  }, "php:1");
}

test("formats initial REST previews without a history or member request", () => {
  assert.equal(reconcileConversationPreview(summary, null, "php:1").preview, "Alex: Hello");
  assert.equal(reconcileConversationPreview(summary, null, "php:2").preview, "You: Hello");
  assert.equal(reconcileConversationPreview({
    ...summary, lastMessageAttachmentContentType: "image/gif",
  }, null, "php:1").preview, "Alex: Sent a GIF");
});

test("orders live frames by timestamp and ID and retains names across duplicate REST results", () => {
  const live = message("003", {
    senderName: "Alex Rivera",
    text: "",
    attachment: { name: "photo.png", contentType: "image/png", size: 4 },
  });
  const stale = message("001", { senderName: "Alex Rivera" });
  const olderTime = message("004", { timestamp: "2026-11-27T04:59:59.999Z" });
  assert.equal(reconcileConversationPreview(summary, stale, "php:1").preview, "Alex: Hello");
  assert.equal(reconcileConversationPreview(summary, olderTime, "php:1").preview, "Alex: Hello");
  const latest = mergeMessages([live], [stale, { ...live, senderName: null }]).at(-1);
  assert.equal(latest.senderName, "Alex Rivera");
  assert.equal(reconcileConversationPreview(summary, latest, "php:1").preview, "Alex: Sent an image");
  assert.equal(reconcileConversationPreview(summary, message("005", {
    senderId: "php:1",
    timestamp: "2026-11-27T05:00:01Z",
  }), "php:1").preview, "You: New message");
});
