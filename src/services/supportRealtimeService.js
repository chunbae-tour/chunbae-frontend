import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getAccessToken, getApiClientConfig } from "./apiClient.js";
import { normalizeSupportMessage } from "./supportService.js";

const SOCKJS_ENDPOINT = import.meta.env.VITE_STOMP_SOCKJS_URL || "";
const SEND_PREFIX = import.meta.env.VITE_STOMP_SEND_PREFIX || "/pub";
const SUBSCRIBE_PREFIX = import.meta.env.VITE_STOMP_SUBSCRIBE_PREFIX || "/sub";

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

export function createSupportRealtimeClient({ supportRoomId, role, onMessage, onStatus, onError }) {
  let client = null;
  let subscription = null;
  const sendDestination = `${SEND_PREFIX}/support/rooms/${supportRoomId}/messages`;
  const subscribeDestination = `${SUBSCRIBE_PREFIX}/support/rooms/${supportRoomId}`;

  function notifyStatus(status) {
    onStatus?.(status);
  }

  function notifyError(error) {
    notifyStatus("error");
    onError?.(error);
  }

  return {
    connect() {
      const accessToken = getAccessToken(role);
      const authorization = accessToken ? `Bearer ${accessToken}` : "";
      notifyStatus("connecting");

      client = new Client({
        webSocketFactory: () => new SockJS(getSockJsUrl(accessToken)),
        connectHeaders: authorization
          ? {
              Authorization: authorization,
              authorization,
              token: accessToken,
            }
          : {},
        reconnectDelay: 3000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: import.meta.env.DEV
          ? (message) => console.debug("[SUPPORT_STOMP]", message)
          : () => {},
        onConnect: () => {
          notifyStatus("connected");
          subscription = client.subscribe(subscribeDestination, (frame) => {
            onMessage?.(normalizeSupportMessage(parseMessageBody(frame.body)));
          });
        },
        onStompError: (frame) => {
          notifyError(
            new Error(frame.body || frame.headers.message || "상담 STOMP 오류가 발생했습니다."),
          );
        },
        onWebSocketError: () => {
          if (client?.connected || client?.active) return;
          notifyError(new Error("상담 WebSocket 연결에 실패했습니다."));
        },
        onWebSocketClose: () => {
          if (client?.active) return;
          notifyStatus("closed");
        },
      });

      client.activate();
    },
    disconnect() {
      subscription?.unsubscribe();
      subscription = null;
      if (client) client.deactivate();
      client = null;
      notifyStatus("closed");
    },
    send({ content = "", messageType = "TEXT", fileUrl, fileName, fileSize }) {
      if (!client?.connected) {
        throw new Error("상담 서버에 연결되지 않았습니다.");
      }
      const payload = {
        messageType,
        content,
        ...(fileUrl ? { fileUrl } : {}),
        ...(fileName ? { fileName } : {}),
        ...(fileSize != null ? { fileSize } : {}),
      };
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
