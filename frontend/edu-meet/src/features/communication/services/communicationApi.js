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

export function createCommunicationApi({ baseUrl = "" } = {}) {
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

  function getConversations(userId, { signal } = {}) {
    const validUserId = requireText(userId, "userId");
    return request("/api/conversations", { userId: validUserId }, signal);
  }

  function getMembers(conversationId, userId, { signal } = {}) {
    const validConversationId = requireText(conversationId, "conversationId");
    const validUserId = requireText(userId, "userId");
    return request(
      `/api/conversations/${encodeURIComponent(validConversationId)}/members`,
      { userId: validUserId },
      signal,
    );
  }

  function getMessages(conversationId, userId, { signal } = {}) {
    const validConversationId = requireText(conversationId, "conversationId");
    const validUserId = requireText(userId, "userId");
    return request(
      `/api/conversations/${encodeURIComponent(validConversationId)}/messages`,
      { userId: validUserId },
      signal,
    );
  }

  function getOlderMessages(conversationId, userId, beforeId, { signal } = {}) {
    const validConversationId = requireText(conversationId, "conversationId");
    const validUserId = requireText(userId, "userId");
    const validBeforeId = requireText(beforeId, "beforeId");
    return request(
      `/api/conversations/${encodeURIComponent(validConversationId)}/messages/older`,
      {
        userId: validUserId,
        beforeId: validBeforeId,
      },
      signal,
    );
  }

  function groupRequest(conversationId, userId, path, { signal, ...options } = {}) {
    const id = encodeURIComponent(requireText(conversationId, "conversationId"));
    const actor = requireText(userId, "userId");
    return request(`/api/conversations/${id}${path}`, { userId: actor }, signal, options);
  }

  function renameGroup(conversationId, userId, name) {
    return groupRequest(conversationId, userId, "/name", { method: "PATCH", body: { name } });
  }

  function getPinnedMessages(conversationId, userId, { signal } = {}) {
    return groupRequest(conversationId, userId, "/pinned-messages", { signal });
  }

  function setMessagePinned(conversationId, userId, messageId, pinned) {
    const id = encodeURIComponent(requireText(messageId, "messageId"));
    return groupRequest(conversationId, userId, `/pinned-messages/${id}`, {
      method: pinned ? "PUT" : "DELETE",
    });
  }

  function sendAttachment(conversationId, userId, file, text) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("text", text);
    return groupRequest(conversationId, userId, "/messages/attachments", { method: "POST", formData });
  }

  function attachmentUrl(conversationId, userId, messageId, inline = false) {
    const conversation = encodeURIComponent(conversationId);
    const message = encodeURIComponent(messageId);
    return buildUrl(`/api/conversations/${conversation}/messages/${message}/attachment`, {
      userId,
      inline: inline || undefined,
    });
  }

  return {
    getConversations,
    getMembers,
    getMessages,
    getOlderMessages,
    renameGroup,
    getPinnedMessages,
    setMessagePinned,
    sendAttachment,
    attachmentUrl,
  };
}

const defaultCommunicationApi = createCommunicationApi();

export const getConversations = defaultCommunicationApi.getConversations;
export const getMembers = defaultCommunicationApi.getMembers;
export const getMessages = defaultCommunicationApi.getMessages;
export const getOlderMessages = defaultCommunicationApi.getOlderMessages;

export const renameGroup = defaultCommunicationApi.renameGroup;
export const getPinnedMessages = defaultCommunicationApi.getPinnedMessages;
export const setMessagePinned = defaultCommunicationApi.setMessagePinned;
export const sendAttachment = defaultCommunicationApi.sendAttachment;
export const attachmentUrl = defaultCommunicationApi.attachmentUrl;
