export class CommunicationApiError extends Error {
  constructor(code, message, { status, backendCode, cause, details } = {}) {
    super(message);
    this.name = "CommunicationApiError";
    this.code = code;
    this.status = status;
    this.backendCode = backendCode;
    this.cause = cause;
    this.details = details;
  }
}

function requireText(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new CommunicationApiError(
      "INVALID_REQUEST",
      `${name} is required`,
    );
  }

  return value;
}

export function createCommunicationApi({ baseUrl = "", accessToken } = {}) {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");

  function buildUrl(path, query = {}) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const searchParams = new URLSearchParams();

    Object.entries(query).forEach(([name, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(name, String(value));
      }
    });

    const queryString = searchParams.toString();
    return `${normalizedBaseUrl}${normalizedPath}${queryString ? `?${queryString}` : ""}`;
  }

  async function request(path, query = {}, signal, { method = "GET", body, formData } = {}) {
    let response;

    try {
      response = await fetch(buildUrl(path, query), {
        method,
        headers: {
          Accept: "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        signal,
        body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
      });
    } catch (error) {
      if (error?.name === "AbortError" || signal?.aborted) {
        throw error;
      }

      throw new CommunicationApiError(
        "NETWORK_ERROR",
        "Could not connect to the communication API.",
        { cause: error },
      );
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      if (error?.name === "AbortError" || signal?.aborted) {
        throw error;
      }

      if (!response.ok) {
        throw new CommunicationApiError(
          "HTTP_ERROR",
          `Request failed with HTTP ${response.status}.`,
          { status: response.status, cause: error },
        );
      }

      throw new CommunicationApiError(
        "MALFORMED_RESPONSE",
        "The communication API returned invalid JSON.",
        { status: response.status, cause: error },
      );
    }

    const isEnvelope =
      payload !== null &&
      typeof payload === "object" &&
      typeof payload.response === "boolean" &&
      Number.isInteger(payload.code) &&
      typeof payload.message === "string" &&
      Object.hasOwn(payload, "body");

    if (!isEnvelope) {
      if (!response.ok) {
        throw new CommunicationApiError(
          "HTTP_ERROR",
          `Request failed with HTTP ${response.status}.`,
          { status: response.status, details: payload },
        );
      }

      throw new CommunicationApiError(
        "MALFORMED_RESPONSE",
        "The communication API response envelope is malformed.",
        { status: response.status, details: payload },
      );
    }

    if (!payload.response) {
      throw new CommunicationApiError(
        "BACKEND_ERROR",
        payload.message,
        {
          status: response.status,
          backendCode: payload.code,
          details: payload.body,
        },
      );
    }

    if (!response.ok) {
      throw new CommunicationApiError(
        "HTTP_ERROR",
        payload.message,
        {
          status: response.status,
          details: payload.body,
        },
      );
    }

    return payload.body;
  }

  function conversationRequest(conversationId, path, { signal, query, ...options } = {}) {
    const id = encodeURIComponent(requireText(conversationId, "conversationId"));
    return request(`/api/conversations/${id}${path}`, query, signal, options);
  }

  function getConversations({ signal } = {}) {
    return request("/api/conversations", {}, signal);
  }

  function createDirectConversation(currentUserId, memberId, { signal } = {}) {
    return request("/api/conversations", {}, signal, {
      method: "POST",
      body: { type: "PRIVATE", participantIds: [currentUserId, memberId] },
    });
  }

  function getMembers(conversationId, options) {
    return conversationRequest(conversationId, "/members", options);
  }

  function getMessages(conversationId, options) {
    return conversationRequest(conversationId, "/messages", options);
  }

  function getOlderMessages(conversationId, beforeId, { signal } = {}) {
    const cursor = requireText(beforeId, "beforeId");
    return conversationRequest(conversationId, "/messages/older", { query: { beforeId: cursor }, signal });
  }

  function renameGroup(conversationId, name) {
    return conversationRequest(conversationId, "/name", { method: "PATCH", body: { name } });
  }

  function leaveGroup(conversationId) {
    return conversationRequest(conversationId, "/membership", { method: "DELETE" });
  }

  function getPinnedMessages(conversationId, options) {
    return conversationRequest(conversationId, "/pinned-messages", options);
  }

  function setMessagePinned(conversationId, messageId, pinned) {
    const id = encodeURIComponent(requireText(messageId, "messageId"));
    return conversationRequest(conversationId, `/pinned-messages/${id}`, { method: pinned ? "PUT" : "DELETE" });
  }

  function sendAttachment(conversationId, file, text) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("text", text);
    return conversationRequest(conversationId, "/messages/attachments", { method: "POST", formData });
  }

  function attachmentUrl(conversationId, messageId) {
    const conversation = encodeURIComponent(conversationId);
    const message = encodeURIComponent(messageId);
    return buildUrl(`/api/conversations/${conversation}/messages/${message}/attachment`);
  }

  function getSocketTicket({ signal } = {}) {
    return request("/api/chat/socket-ticket", {}, signal, { method: "POST" });
  }

  function getCurrentAccount({ signal } = {}) {
    return request("/api/chat/me", {}, signal);
  }

  return {
    getConversations,
    createDirectConversation,
    getMembers,
    getMessages,
    getOlderMessages,
    renameGroup,
    leaveGroup,
    getPinnedMessages,
    setMessagePinned,
    sendAttachment,
    attachmentUrl,
    getSocketTicket,
    getCurrentAccount,
  };
}
