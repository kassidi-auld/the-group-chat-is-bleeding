"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  MessageCircle,
  Radio,
  Shield,
  Skull,
  X,
} from "lucide-react";
import {
  locations,
  type Command,
  type RoomView,
  type Challenge,
} from "@/lib/types";
import { Avatar, avatars } from "./avatar";
import { seconds } from "@/lib/time";
const taskNames = {
  aid: "Beat financial aid",
  paper: "Submit the panic paper",
  tickets: "Secure homecoming tickets",
};
export function Round({
  room,
  send,
}: {
  room: RoomView;
  send: (c: Command) => void;
}) {
  const [active, setActive] = useState<Challenge | null>(null);
  useEffect(() => setActive(null), [room.phase, room.me.location]);
  const remaining = seconds(room.deadline, room.now);
  return (
    <section className="round">
      <div className="round-top">
        <div>
          <div className="eyebrow">
            ROOM {room.code} /{" "}
            {room.phase === "meeting"
              ? "EMERGENCY TRIBUNAL"
              : "CAMPUS AFTER HOURS"}
          </div>
          <h2>
            {room.phase === "meeting"
              ? "Okay. Who’s doing the most?"
              : room.banner === "THE GROUP CHAT IS BLEEDING"
                ? "Keep the chat alive."
                : room.banner}
          </h2>
        </div>
        <span className={`timer ${remaining < 30 ? "urgent" : ""}`}>
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="round-layout">
        <div className="play-area">
          <div className="role-bar">
            <span>
              {room.role === "chaos" ? (
                <Skull size={18} />
              ) : (
                <Shield size={18} />
              )}
              YOU ARE {room.role === "chaos" ? "THE CHAOS" : "THE CREW"}
            </span>
            <b>{room.me.alive ? "Stay convincing." : "BLOCKED · SPECTATING"}</b>
          </div>
          {room.phase === "meeting" ? (
            <>
              <p className="muted mb-5">
                Discuss the receipts. Votes lock instantly. Ties and skips spare
                everyone.
              </p>
              <div className="vote-grid">
                {room.players
                  .filter((p) => p.alive)
                  .map((p) => (
                    <button
                      disabled={!room.me.alive || !!room.votes[room.me.id]}
                      className={`vote-card ${room.votes[p.id] ? "has-voted" : ""}`}
                      key={p.id}
                      onClick={() => send({ type: "vote", target: p.id })}
                    >
                      <Avatar index={p.avatar} />
                      <b>{p.name}</b>
                      <span>{p.title}</span>
                      <small>
                        {room.votes[p.id]
                          ? "✓ VOTE LOCKED"
                          : "POINT THE FINGER ↗"}
                      </small>
                    </button>
                  ))}
              </div>
              <div className="flex gap-3 flex-wrap mt-5">
                <button
                  className="btn"
                  disabled={!room.me.alive || !!room.votes[room.me.id]}
                  onClick={() => send({ type: "vote", target: "skip" })}
                >
                  Skip. I need more receipts.
                </button>
                <span className="muted self-center">
                  {Object.keys(room.votes).length} votes locked
                </span>
              </div>
              <div className="reactions">
                {["😭", "👀", "🧾", "💀", "🗣️", "🍅"].map((e) => (
                  <button
                    aria-label={`React ${e}`}
                    disabled={!room.me.alive}
                    key={e}
                    onClick={() => send({ type: "react", emoji: e })}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="progress-label">
                <b>CHAT SURVIVAL</b>
                <span>
                  {room.progress} / {room.goal} tasks
                </span>
              </div>
              <div className="progress-track">
                <motion.div
                  animate={{
                    width: `${room.goal ? (100 * room.progress) / room.goal : 0}%`,
                  }}
                />
              </div>
              <div className="map-header">
                <span>THE CAMPUS</span>
                <span>
                  {room.lockUntil > room.now
                    ? `🔒 LOCKDOWN · ${seconds(room.lockUntil, room.now)}s`
                    : "SELECT A ROOM TO MOVE"}
                </span>
              </div>
              <div className="campus-map">
                {locations.map((loc, i) => (
                  <button
                    disabled={!room.me.alive || room.lockUntil > room.now}
                    key={loc}
                    className={`map-room room-${i} ${room.me.location === loc ? "current" : ""}`}
                    onClick={() => send({ type: "move", location: loc })}
                  >
                    <span className="room-symbol">
                      {["✳", "＄", "▤", "★", "↓"][i]}
                    </span>
                    <b>{loc}</b>
                    <small>
                      {
                        room.players.filter(
                          (p) => p.alive && p.location === loc,
                        ).length
                      }{" "}
                      in here
                    </small>
                    <div className="room-people">
                      {room.players
                        .filter((p) => p.alive && p.location === loc)
                        .map((p) => (
                          <span title={p.name} key={p.id}>
                            {avatars[p.avatar]}
                          </span>
                        ))}
                    </div>
                    {room.me.location === loc && (
                      <span className="you-marker">YOU ARE HERE</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="task-heading">
                <h3>
                  {room.role === "chaos"
                    ? "Your chaos toolkit"
                    : "Your unfinished business"}
                </h3>
                <span>PRIVATE TO YOU</span>
              </div>
              {room.role === "chaos" ? (
                <div className="task-list">
                  {(["banner", "receipts", "lockdown"] as const).map(
                    (kind, i) => (
                      <button
                        className="task-row"
                        disabled={
                          !room.me.alive || room.cooldownUntil > room.now
                        }
                        key={kind}
                        onClick={() => send({ type: "sabotage", kind })}
                      >
                        <span className="task-icon">
                          {["🎭", "🧾", "🔒"][i]}
                        </span>
                        <div>
                          <b>
                            {
                              [
                                "Change the banner",
                                "Expose the receipts",
                                "Lock campus down",
                              ][i]
                            }
                          </b>
                          <p>
                            {
                              [
                                "Public disrespect. Private satisfaction.",
                                "Reveal locations. Steal 10 seconds.",
                                "Freeze movement and tasks for 10 seconds.",
                              ][i]
                            }
                          </p>
                        </div>
                        <span>
                          {room.cooldownUntil > room.now
                            ? `${seconds(room.cooldownUntil, room.now)}s`
                            : "↗"}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              ) : (
                <div className="task-list">
                  {room.tasks.map((t) => (
                    <button
                      className="task-row"
                      key={t.id}
                      disabled={
                        !room.me.alive ||
                        room.completed.includes(t.id) ||
                        room.me.location !== t.location ||
                        room.lockUntil > room.now
                      }
                      onClick={() => setActive(t)}
                    >
                      <span className="task-icon">
                        {room.completed.includes(t.id)
                          ? "✅"
                          : { aid: "💸", paper: "📄", tickets: "🎟️" }[t.kind]}
                      </span>
                      <div>
                        <b>{taskNames[t.kind]}</b>
                        <p>
                          {t.location} ·{" "}
                          {room.completed.includes(t.id)
                            ? "Handled. You ate."
                            : room.me.location === t.location
                              ? "Ready to handle"
                              : "Move here to begin"}
                        </p>
                      </div>
                      <ArrowUpRight size={18} />
                    </button>
                  ))}
                </div>
              )}
              <button
                className="btn emergency"
                disabled={
                  !room.me.alive ||
                  room.me.meetings >= 2 ||
                  room.meetingCooldown > room.now
                }
                onClick={() => send({ type: "meeting" })}
              >
                <Radio size={18} />
                Call the tribunal
                {room.meetingCooldown > room.now
                  ? ` · ${seconds(room.meetingCooldown, room.now)}s`
                  : ""}
              </button>
            </>
          )}
        </div>
        <aside className="feed">
          <div className="feed-header">
            <MessageCircle size={17} />
            <b>THE GROUP CHAT</b>
            <span className="live-dot" />
          </div>
          <div className="feed-messages">
            {room.feed.slice(-15).map((f) => (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                key={f.id}
                className="feed-message"
              >
                <span>{f.emoji}</span>
                <p>
                  {f.text}
                  <small>
                    {new Date(f.at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </p>
              </motion.div>
            ))}
          </div>
          <div className="feed-foot">Read the room. Literally.</div>
        </aside>
      </div>
      {active && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-title"
          >
            <button
              autoFocus
              aria-label="Close task"
              className="icon-btn float-right"
              onClick={() => setActive(null)}
            >
              <X />
            </button>
            <div className="eyebrow">{active.location} / MICRO-TASK</div>
            <h2 id="task-title">{taskNames[active.kind]}</h2>
            <p className="mb-5">{active.prompt}</p>
            {active.choices.map((choice, i) => (
              <button
                className="choice"
                key={choice}
                onClick={() => {
                  send({ type: "task", id: active.id, answer: i });
                  setActive(null);
                }}
              >
                <span>0{i + 1}</span>
                {choice}
                <ArrowUpRight size={17} />
              </button>
            ))}
          </section>
        </div>
      )}
    </section>
  );
}
