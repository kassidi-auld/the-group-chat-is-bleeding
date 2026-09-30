"use client";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { Ack, Command, Join, RoomView } from "./types";
export function useGame() {
  const socket = useRef<Socket | null>(null);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const s = io({ autoConnect: false });
    socket.current = s;
    s.on("connect", () => {
      setConnected(true);
      const saved = sessionStorage.getItem("bleeding-session");
      if (saved) {
        try {
          const input = JSON.parse(saved);
          s.timeout(6000).emit("join", input, (err: Error | null, ack: Ack) => {
            if (err || !ack.ok) {
              setError(ack?.error ?? "Could not reconnect.");
              sessionStorage.removeItem("bleeding-session");
              setRoom(null);
            }
          });
        } catch {
          sessionStorage.removeItem("bleeding-session");
        }
      }
    });
    s.on("disconnect", () => setConnected(false));
    s.on("state", (r: RoomView) =>
      setRoom((previous) =>
        !previous || r.code !== previous.code || r.revision >= previous.revision
          ? r
          : previous,
      ),
    );
    s.on("superseded", () => {
      sessionStorage.removeItem("bleeding-session");
      setError("This player opened the chat in another tab.");
      setRoom(null);
    });
    s.on("connect_error", () => setError("Connection lost. Reconnecting…"));
    s.connect();
    return () => {
      s.disconnect();
    };
  }, []);
  function enter(input: Join) {
    if (!socket.current?.connected) {
      setError("Connecting to campus. Try again in a moment.");
      return;
    }
    setBusy(true);
    setError("");
    socket.current
      .timeout(6000)
      .emit("join", input, (err: Error | null, ack: Ack) => {
        setBusy(false);
        if (err || !ack.ok)
          setError(ack?.error ?? "The server took too long. Please retry.");
        else
          sessionStorage.setItem(
            "bleeding-session",
            JSON.stringify({ ...input, token: ack.token, code: ack.code }),
          );
      });
  }
  function send(c: Command) {
    if (!socket.current?.connected) {
      setError("Reconnect before taking an action.");
      return;
    }
    setError("");
    socket.current
      .timeout(6000)
      .emit("command", c, (err: Error | null, ack: Ack) => {
        if (err || !ack.ok)
          setError(
            ack?.error ??
              "Action timed out. Check the updated room before retrying.",
          );
      });
  }
  return {
    room,
    connected,
    error,
    busy,
    enter,
    send,
    clearError: () => setError(""),
  };
}
