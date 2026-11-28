export class ChatSocketError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "ChatSocketError";
    this.code = code;
    this.details = details;
  }
}

function requireString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ChatSocketError(
      "INVALID_ARGUMENT",
      `${name} is required`,
      { field: name },
    );
  }

  return value;
}

function normalizeEndpoint(endpoint) {
  const value = requireString(endpoint, "endpoint").replace(/\/+$/, "");

  let url;
  if (/^https?:\/\//i.test(value)) {
    url = new URL(value);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  } else if (/^wss?:\/\//i.test(value)) {
    url = new URL(value);
  } else if (value.startsWith("/")) {
    const locationProtocol =
      typeof window !== "undefined" && window.location?.protocol === "https:"
        ? "wss:"
        : "ws:";
    const host =
      typeof window !== "undefined" && window.location?.host
        ? window.location.host
        : "localhost";
    url = new URL(`${locationProtocol}//${host}${value}`);
  } else {
    url = new URL(`ws://${value}`);
  }

  if (url.pathname === "" || url.pathname === "/") {
    url.pathname = "/chat";
  }

  return url;
}

function isSavedMessage(payload) {
  return (
    payload !== null &&
    typeof payload === "object" &&
    typeof payload.id === "string" &&
    typeof payload.conversationId === "string" &&
    typeof payload.senderId === "string" &&
    typeof payload.text === "string" &&
    payload.timestamp != null &&
    (typeof payload.timestamp === "string" ||
      typeof payload.timestamp === "number")
  );
}

function isBackendError(payload) {
  return (
    payload !== null &&
    typeof payload === "object" &&
    payload.type === "message_error" &&
    typeof payload.code === "string" &&
    typeof payload.conversationId === "string" &&
    typeof payload.message === "string"
  );
}

export function createChatSocket({
  endpoint,
  ticket,
  WebSocketImpl = globalThis.WebSocket,
} = {}) {
  const validTicket = requireString(ticket, "ticket");
  const socketUrl = normalizeEndpoint(endpoint);
  socketUrl.searchParams.set("ticket", validTicket);

  let socket = null;
  let state = "disconnected";
  const savedMessageHandlers = new Set();
  const pinsChangedHandlers = new Set();
  const unsentMessageHandlers = new Set();
  const errorHandlers = new Set();
  const stateHandlers = new Set();

  function setState(nextState) {
    if (state === nextState) {
      return;
    }

    state = nextState;
    stateHandlers.forEach((handler) => {
      try {
        handler(nextState);
      } catch {
        // Listener failures must not disrupt WebSocket lifecycle handling.
      }
    });
  }

  function emitError(error) {
    errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch {
        // Listener failures must not disrupt WebSocket lifecycle handling.
      }
    });
  }

  function subscribe(set, handler) {
    if (typeof handler !== "function") {
      throw new ChatSocketError(
        "INVALID_ARGUMENT",
        "A listener function is required",
      );
    }

    set.add(handler);
    return () => set.delete(handler);
  }

  function retireSocket(activeSocket) {
    activeSocket.onopen = null;
    activeSocket.onmessage = null;
    activeSocket.onerror = null;
    activeSocket.onclose = null;
  }

  function connect() {
    if (socket) {
      const readyState = socket.readyState;
      if (
        readyState === (WebSocketImpl.CONNECTING ?? 0) ||
        readyState === (WebSocketImpl.OPEN ?? 1) ||
        readyState === (WebSocketImpl.CLOSING ?? 2)
      ) {
        return false;
      }
      retireSocket(socket);
      socket = null;
    }

    if (typeof WebSocketImpl !== "function") {
      throw new ChatSocketError(
        "WEBSOCKET_UNAVAILABLE",
        "A WebSocket implementation is unavailable.",
      );
    }

    let nextSocket;
    try {
      nextSocket = new WebSocketImpl(socketUrl.toString());
    } catch (error) {
      socket = null;
      setState("error");
      emitError(
        new ChatSocketError(
          "WEBSOCKET_CONSTRUCTION_FAILED",
          "The chat socket could not be constructed.",
          { cause: error },
        ),
      );
      return false;
    }
    socket = nextSocket;
    setState("connecting");

    nextSocket.onopen = () => {
      if (socket !== nextSocket) {
        return;
      }
      setState("open");
    };

    nextSocket.onmessage = (event) => {
      if (socket !== nextSocket) {
        return;
      }

      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        emitError({
          type: "malformed_json",
          code: "MALFORMED_JSON",
          message: "Received malformed JSON from the chat socket.",
        });
        return;
      }

      if (isBackendError(payload)) {
        emitError(payload);
        return;
      }

      if (payload?.type === "pins_changed" && typeof payload.conversationId === "string") {
        pinsChangedHandlers.forEach((handler) => {
          try {
            handler(payload.conversationId);
          } catch {
            // A subscriber should not interrupt the others.
          }
        });
        return;
      }

      if (payload?.type === "message_unsent" && typeof payload.conversationId === "string" &&
          typeof payload.messageId === "string") {
        unsentMessageHandlers.forEach((handler) => {
          try {
            handler(payload.conversationId, payload.messageId);
          } catch {
            // A subscriber should not interrupt the others.
          }
        });
        return;
      }

      if (isSavedMessage(payload)) {
        savedMessageHandlers.forEach((handler) => {
          try {
            handler(payload);
          } catch {
            // Listener failures must not disrupt incoming message handling.
          }
        });
        return;
      }

      emitError({
        type: "unexpected_payload",
        code: "UNEXPECTED_PAYLOAD",
        message: "Received an unexpected chat socket payload.",
        payload,
      });
    };

    nextSocket.onerror = () => {
      if (socket !== nextSocket) {
        return;
      }
      setState("error");
      emitError({
        type: "connection_error",
        code: "WEBSOCKET_ERROR",
        message: "The chat socket encountered a connection error.",
      });
    };

    nextSocket.onclose = (event) => {
      if (socket !== nextSocket) {
        return;
      }
      socket = null;
      setState("closed");

      const closeCode = event?.code;
      const isNormalClose =
        event?.wasClean === true &&
        (closeCode === 1000 || closeCode === 1001);

      if (isNormalClose) {
        return;
      }

      emitError({
        type: "connection_closed",
        code: "WEBSOCKET_CLOSED",
        message: "The chat socket closed.",
        details: {
          code: event?.code,
          reason: event?.reason,
          wasClean: event?.wasClean,
        },
      });
    };

    return true;
  }

  function disconnect() {
    if (!socket) {
      setState("disconnected");
      return true;
    }

    const activeSocket = socket;
    socket = null;
    retireSocket(activeSocket);

    const readyState = activeSocket.readyState;
    if (
      readyState === (WebSocketImpl.OPEN ?? 1) ||
      readyState === (WebSocketImpl.CONNECTING ?? 0)
    ) {
      setState("closing");
      activeSocket.close();
    }

    setState("disconnected");
    return true;
  }

  function sendMessage({ conversationId, text } = {}) {
    const validConversationId = requireString(
      conversationId,
      "conversationId",
    );
    const validText = requireText(text);

    if (
      !socket ||
      state !== "open" ||
      socket.readyState !== (WebSocketImpl.OPEN ?? 1)
    ) {
      throw new ChatSocketError(
        "SOCKET_NOT_OPEN",
        "The chat socket is not open.",
        { state },
      );
    }

    socket.send(
      JSON.stringify({
        conversationId: validConversationId,
        text: validText,
      }),
    );
    return true;
  }

  function requireText(value) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new ChatSocketError(
        "INVALID_MESSAGE",
        "text is required",
        { field: "text" },
      );
    }

    if (value.length > 2000) {
      throw new ChatSocketError(
        "MESSAGE_TOO_LONG",
        "text must not exceed 2000 characters",
        { field: "text", maximumLength: 2000 },
      );
    }

    return value;
  }

  return {
    connect,
    disconnect,
    sendMessage,
    getState: () => state,
    onSavedMessage: (handler) =>
      subscribe(savedMessageHandlers, handler),
    onPinsChanged: (handler) => subscribe(pinsChangedHandlers, handler),
    onMessageUnsent: (handler) => subscribe(unsentMessageHandlers, handler),
    onError: (handler) => subscribe(errorHandlers, handler),
    onStateChange: (handler) => subscribe(stateHandlers, handler),
  };
}
