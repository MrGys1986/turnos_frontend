import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export default function useStomp({ baseUrl, topics = [], onMessage, debug = false }) {
  const clientRef = useRef(null);

  useEffect(() => {
    const sock = new SockJS(`${baseUrl}/ws`);
    const client = new Client({
      webSocketFactory: () => sock,
      reconnectDelay: 3000,
      debug: debug ? (str) => console.log("[STOMP]", str) : undefined,
    });
    client.onConnect = () => {
      topics.forEach((t) => {
        client.subscribe(t, (msg) => {
          try { onMessage && onMessage(JSON.parse(msg.body)); }
          catch { onMessage && onMessage(msg.body); }
        });
      });
    };
    client.activate();
    clientRef.current = client;
    return () => client.deactivate();
  }, [baseUrl, JSON.stringify(topics)]); // eslint-disable-line react-hooks/exhaustive-deps

  return clientRef;
}
