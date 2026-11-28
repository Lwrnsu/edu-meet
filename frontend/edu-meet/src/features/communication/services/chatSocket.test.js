import assert from "node:assert/strict";
import { test } from "node:test";
import { createChatSocket } from "./chatSocket.js";

test("dispatches pin changes separately from saved messages and errors", () => {
  let transport;
  class MockWebSocket {
    constructor() {
      transport = this;
    }
  }

  const socket = createChatSocket({
    endpoint: "ws://localhost/chat", ticket: "test-ticket", WebSocketImpl: MockWebSocket,
  });
  const changes = [];
  const messages = [];
  const errors = [];
  const unsubscribe = socket.onPinsChanged((id) => changes.push(id));
  socket.onSavedMessage((message) => messages.push(message));
  socket.onError((error) => errors.push(error));
  socket.connect();
  const receive = (payload) => transport.onmessage({ data: JSON.stringify(payload) });
  const change = { type: "pins_changed", conversationId: "direct" };
  const message = {
    id: "message", conversationId: "direct", senderId: "php:2",
    senderName: "Alex", text: "Hello", timestamp: "2026-11-27T05:00:00Z",
  };
  receive(change);
  receive(message);
  unsubscribe();
  receive(change);

  assert.deepEqual(changes, ["direct"]);
  assert.deepEqual(messages, [message]);
  assert.deepEqual(errors, []);
});
