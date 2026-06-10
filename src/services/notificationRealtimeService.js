import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getAccessToken, getApiClientConfig } from "./apiClient.js";
import { normalizeNotification } from "./notificationService.js";

const SOCKJS_ENDPOINT = import.meta.env.VITE_STOMP_SOCKJS_URL || "";
const NOTIFICATION_QUEUE = import.meta.env.VITE_STOMP_NOTIFICATION_QUEUE || "/user/queue/notifications";

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

function parseBody(body) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return { message: body };
  }
}

export function createNotificationRealtimeClient({ onNotification, onStatus, onError } = {}) {
  let client = null;
  let subscription = null;

  return {
    connect() {
      const accessToken = getAccessToken();
      if (!accessToken) return;

      const authorization = `Bearer ${accessToken}`;
      onStatus?.("connecting");

      client = new Client({
        webSocketFactory: () => new SockJS(getSockJsUrl(accessToken)),
        connectHeaders: {
          Authorization: authorization,
          authorization,
          token: accessToken,
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: import.meta.env.DEV ? (message) => console.debug("[NOTIFICATION_STOMP]", message) : () => {},
        onConnect: () => {
          onStatus?.("connected");
          subscription = client.subscribe(NOTIFICATION_QUEUE, (frame) => {
            onNotification?.(normalizeNotification(parseBody(frame.body)));
          });
        },
        onStompError: (frame) => {
          onStatus?.("error");
          onError?.(new Error(frame.body || frame.headers.message || "알림 STOMP 오류가 발생했습니다."));
        },
        onWebSocketError: (event) => {
          if (client?.connected || client?.active) return;
          onStatus?.("error");
          onError?.(event);
        },
        onWebSocketClose: () => {
          if (client?.active) return;
          onStatus?.("closed");
        },
      });

      client.activate();
    },
    disconnect() {
      subscription?.unsubscribe();
      subscription = null;
      client?.deactivate();
      client = null;
      onStatus?.("closed");
    },
  };
}
