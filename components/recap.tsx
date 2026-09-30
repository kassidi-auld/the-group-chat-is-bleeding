"use client";
import { useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { Download, Share2 } from "lucide-react";
import type { RoomView } from "@/lib/types";
import { Avatar } from "./avatar";
export function Recap({
  room,
  rematch,
}: {
  room: RoomView;
  rematch: () => void;
}) {
  const card = useRef<HTMLDivElement>(null),
    [message, setMessage] = useState("");
  async function exportCard(share: boolean) {
    try {
      const blob = await toBlob(card.current!, {
        pixelRatio: 2,
        backgroundColor: "#17171e",
      });
      if (!blob) throw Error();
      const file = new File([blob], "group-chat-receipts.png", {
        type: "image/png",
      });
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "The group chat was bleeding",
        });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Receipts saved. Post responsibly. Or don’t.");
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setMessage("Could not export. You can screenshot the card.");
    }
  }
  return (
    <section className="recap-wrap">
      <div className="eyebrow">THE RECEIPTS ARE IN</div>
      <h2>
        That chat was <em>unwell.</em>
      </h2>
      <div className="recap-card" ref={card}>
        <div className="flex items-center gap-3">
          <Avatar index={room.me.avatar} small />
          <div>
            <b>The Group Chat</b>
            <p className="muted">@thechat • room {room.code}</p>
          </div>
          <span className="ml-auto text-acid">✦</span>
        </div>
        <h3>
          {room.winner === "crew"
            ? "THE CHAT SURVIVED."
            : "CHAOS ATE. NO CRUMBS."}
        </h3>
        <p>
          {room.winner === "crew"
            ? "We clocked the mess and kept it moving."
            : "Four minutes. Several betrayals. Zero accountability."}
        </p>
        <div className="stat-grid">
          <div>
            <b>{room.me.tasks}</b>
            <span>tasks carried</span>
          </div>
          <div>
            <b>{room.me.votesReceived}</b>
            <span>side-eyes earned</span>
          </div>
          <div>
            <b>{room.me.disruptions}</b>
            <span>disruptions</span>
          </div>
        </div>
        <div className="quote">
          <b>{room.me.name}</b>
          <span>
            “
            {room.role === "chaos"
              ? "I was just here for the vibes. Allegedly."
              : "I did my part. Check the timestamps."}
            ”
          </span>
        </div>
        <div className="role-reveal">
          {room.players.map((p) => (
            <span key={p.id}>
              {p.name} {room.roles?.[p.id] === "chaos" ? "🩸" : "✅"}
            </span>
          ))}
        </div>
        <footer>the group chat is bleeding ↗ &nbsp; #SaveTheChat</footer>
      </div>
      <div className="flex flex-wrap gap-3 mt-5">
        <button className="btn primary" onClick={() => exportCard(true)}>
          <Share2 size={18} />
          Share receipts
        </button>
        <button className="btn" onClick={() => exportCard(false)}>
          <Download size={18} />
          Save PNG
        </button>
        {room.hostId === room.me.id && (
          <button className="btn" onClick={rematch}>
            Run it back ↗
          </button>
        )}
      </div>
      <p role="status" className="muted mt-3">
        {message}
      </p>
    </section>
  );
}
