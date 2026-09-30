"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Copy, Flame } from "lucide-react";
import type { Command, RoomView } from "@/lib/types";
import { Avatar } from "./avatar";
export function Lobby({
  room,
  send,
}: {
  room: RoomView;
  send: (c: Command) => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="lobby">
      <div className="eyebrow">THE PRE-GAME / ROOM {room.code}</div>
      <div className="section-heading">
        <div>
          <h2>
            The chat is assembling<span className="text-hot">.</span>
          </h2>
          <p className="muted">
            {room.players.length}/10 in the chat. Trust nobody. Invite
            everybody.
          </p>
        </div>
        <button
          className="room-code"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(room.code);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          <span>{copied ? "COPIED" : "ROOM CODE"}</span>
          <b>{room.code}</b>
          <Copy size={17} />
        </button>
      </div>
      <div className="player-grid">
        {room.players.map((p) => (
          <motion.div layout key={p.id} className="player-card">
            <Avatar index={p.avatar} />
            <div>
              <b>
                {p.name} {p.id === room.me.id && <small>(you)</small>}
              </b>
              <p>{p.title}</p>
            </div>
            {!p.connected && room.hostId === room.me.id && (
              <button
                className="btn"
                aria-label={`Remove ${p.name}`}
                onClick={() => send({ type: "remove", target: p.id })}
              >
                Remove
              </button>
            )}
            <span className="player-status">
              {p.id === room.hostId ? "HOST" : p.connected ? "READY" : "AWAY"}
            </span>
          </motion.div>
        ))}
        {Array.from(
          { length: Math.max(0, 4 - room.players.length) },
          (_, i) => (
            <div className="player-card empty" key={i}>
              <span>＋</span>
              <p>Waiting for the plot…</p>
            </div>
          ),
        )}
      </div>
      <div className="lobby-bottom">
        <div>
          <Flame className="text-hot" />
          <span>
            One of you is about to be <b>the problem.</b>
            <p className="muted">
              Roles are assigned privately when the host starts.
            </p>
          </span>
        </div>
        {room.hostId === room.me.id ? (
          <button
            className="btn primary"
            disabled={
              room.players.length < 4 || room.players.some((p) => !p.connected)
            }
            onClick={() => send({ type: "start" })}
          >
            Let the chat bleed <ArrowUpRight size={19} />
          </button>
        ) : (
          <p className="muted">Waiting for the host to start…</p>
        )}
      </div>
    </section>
  );
}
