import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getAccessToken, getApiClientConfig } from "./apiClient.js";
import { normalizeChatMessage } from "./chatService.js";

const SOCKJS_ENDPOINT = import.meta.env.VITE_STOMP_SOCKJS_URL || "";
const MESSAGE_SEND_PREFIX = import.meta.env.VITE_STOMP_SEND_PREFIX || "/pub";
const MESSAGE_SUBSCRIBE_PREFIX = import.meta.env.VITE_STOMP_SUBSCRIBE_PREFIX || "/sub";
const MESSAGE_SUBSCRIBE_TEMPLATE = import.meta.env.VITE_STOMP_SUBSCRIBE_DESTINATION || "";

function appendTokenQuery(url, accessToken) {
  if (!accessToken) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(accessToken)}`;
}

function getSockJsUrl(accessToken) {
  if (SOCKJS_ENDPOINT) return appendTokenQuery(SOCKJS_ENDPOINT, accessToken);

  const { baseUrl } = getApiClientConfig();
  const normalizedBaseUrl = (baseUrl || window.location.origin).replace(/\/+$/, "");
  return appendTokenQuery(`${normalizedBaseUrl}/ws-stomp`, accessToken);
}

function parseMessageBody(body) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return { content: body };
  }
}

export function createChatRealtimeClient({ chatRoomId, onMessage, onStatus, onError }) {
  let client = null;
  let subscription = null;
  const sendDestination = `${MESSAGE_SEND_PREFIX}/chat/rooms/${chatRoomId}/messages`;
  const subscribeDestination = MESSAGE_SUBSCRIBE_TEMPLATE
    ? MESSAGE_SUBSCRIBE_TEMPLATE.replace("{chatRoomId}", chatRoomId)
    : `${MESSAGE_SUBSCRIBE_PREFIX}/chat/rooms/${chatRoomId}`;

  function notifyStatus(status) {
    onStatus?.(status);
  }

  function notifyError(error) {
    notifyStatus("error");
    onError?.(error);
  }

  return {
    connect() {
      const accessToken = getAccessToken("USER");
      notifyStatus("connecting");

      const authorization = accessToken ? `Bearer ${accessToken}` : "";

      client = new Client({
        webSocketFactory: () => new SockJS(getSockJsUrl(accessToken)),
        connectHeaders: authorization ? {
          Authorization: authorization,
          authorization,
          token: accessToken,
        } : {},
        reconnectDelay: 3000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: import.meta.env.DEV ? (message) => console.debug("[STOMP]", message) : () => {},
        onConnect: () => {
          console.info("Chat realtime connected", {
            chatRoomId,
            sendDestination,
            subscribeDestination,
          });
          notifyStatus("connected");
          subscription = client.subscribe(subscribeDestination, (frame) => {
            console.info("Chat realtime message", { destination: subscribeDestination, body: frame.body });
            onMessage?.(normalizeChatMessage(parseMessageBody(frame.body)));
          });
        },
        onStompError: (frame) => {
          console.error("Chat realtime STOMP error", {
            headers: frame.headers,
            body: frame.body,
          });
          notifyError(new Error(frame.body || frame.headers.message || "STOMP 오류가 발생했습니다."));
        },
        onWebSocketError: (event) => {
          if (client?.connected || client?.active) return;
          console.error("Chat realtime WebSocket error", event);
          notifyError(new Error("채팅 WebSocket 연결에 실패했습니다."));
        },
        onWebSocketClose: (event) => {
          console.info("Chat realtime WebSocket closed", {
            code: event?.code,
            reason: event?.reason,
            wasClean: event?.wasClean,
            active: client?.active,
            connected: client?.connected,
          });
          if (client?.active) return;
          notifyStatus("closed");
        },
      });

      client.activate();
    },
    disconnect() {
      subscription?.unsubscribe();
      subscription = null;
      if (client) {
        client.deactivate();
      }
      client = null;
      notifyStatus("closed");
    },
    send({
      content = "",
      messageType = "TEXT",
      fileUrl,
      fileName,
      fileSize,
      attachmentIds = [],
    }) {
      if (!client?.connected) {
        throw new Error("채팅 서버에 연결되지 않았습니다.");
      }
      const payload = { content, messageType };
      if (fileUrl) payload.fileUrl = fileUrl;
      if (fileName) payload.fileName = fileName;
      if (typeof fileSize === "number") payload.fileSize = fileSize;
      if (attachmentIds.length > 0) payload.attachmentIds = attachmentIds;

      client.publish({
        destination: sendDestination,
        body: JSON.stringify(payload),
        headers: { "content-type": "application/json" },
      });
    },
    isConnected() {
      return Boolean(client?.connected);
    },
  };
}
