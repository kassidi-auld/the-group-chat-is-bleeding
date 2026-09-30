"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Copy,
  Flame,
  MessageCircle,
  Radio,
  Shield,
  Skull,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { useGame } from "@/lib/use-game";
import { sound } from "@/lib/sound";
import {
  locations,
  titles,
  type Challenge,
  type Command,
  type RoomView,
} from "@/lib/types";
import { Avatar, avatars } from "./avatar";
import { Recap } from "./recap";
import { Lobby } from "./lobby";
import { Round } from "./round";
import { seconds } from "@/lib/time";
export function Game() {
  const { room, connected, error, busy, enter, send, clearError } = useGame();
  const [name, setName] = useState(""),
    [title, setTitle] = useState<string>(titles[0]),
    [avatar, setAvatar] = useState(0),
    [code, setCode] = useState(""),
    [mode, setMode] = useState<"create" | "join">("create"),
    [muted, setMuted] = useState(false),
    [help, setHelp] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!muted && room?.phase === "meeting") sound("alarm");
    if (!muted && room?.phase === "ended") sound("win");
  }, [room?.phase, muted]);
  const act = (c: Command) => {
    if (!muted) sound(c.type === "meeting" ? "alarm" : "vote");
    send(c);
  };
  return (
    <main>
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-icon">
            <MessageCircle size={20} />
          </span>
          <span>
            the group chat<span className="brand-sub">IS BLEEDING.</span>
          </span>
        </a>
        <div className="flex items-center gap-3">
          <span className={`connection ${connected ? "online" : ""}`}>
            <i />
            {connected ? "LIVE" : "CONNECTING"}
          </span>
          <button
            className="icon-btn"
            aria-label={muted ? "Enable sound" : "Mute sound"}
            onClick={() => setMuted(!muted)}
          >
            {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>
          <button className="how" onClick={() => setHelp(true)}>
            How to play <ArrowUpRight size={14} />
          </button>
        </div>
      </header>
      {error && (
        <div className="toast" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={clearError}>
            <X size={16} />
          </button>
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={room?.phase ?? "home"}
          initial={{ opacity: 0, y: reduced ? 0 : 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          {!room ? (
            <>
              <div className="landing">
                <section className="hero">
                  <div className="eyebrow">
                    <span className="live-dot" /> FRIENDSHIPS WILL BE TESTED.
                  </div>
                  <h1>
                    The group
                    <br />
                    chat is
                    <br />
                    <span className="bleeding">
                      bleeding<span className="asterisk">✳</span>
                    </span>
                    <span className="period">.</span>
                  </h1>
                  <p className="hero-copy">
                    Somebody’s doing tasks.
                    <br />
                    Somebody’s doing <b>the most.</b>
                    <br />
                    Find the chaos before the chat falls apart.
                  </p>
                  <div className="hero-tags">
                    <span>
                      <Radio size={14} />
                      4–10 players
                    </span>
                    <span>
                      <Zap size={14} />
                      4-minute rounds
                    </span>
                    <span>↗ Zero downloads</span>
                  </div>
                  <div className="chat-preview">
                    <div className="chat-sticker">THE RECEIPTS???</div>
                    <div className="bubble purple">
                      why is financial aid locked 😭
                      <small>main character · 2:03 PM</small>
                    </div>
                    <div className="bubble green">
                      who changed the banner to “doing bad”
                      <small>certified hater · 2:03 PM</small>
                    </div>
                    <div className="bubble dark">
                      <span className="typing">● ● ●</span> somebody is lying.
                    </div>
                    <span className="receipt-sticker">🧾</span>
                  </div>
                </section>
                <section className="entry-card">
                  <div className="card-label">
                    YOUR NEXT BAD DECISION <span>↗</span>
                  </div>
                  <h2>Enter the chat.</h2>
                  <p className="muted">
                    Bring your people. Leave your trust issues.
                  </p>
                  <div className="tabs">
                    <button
                      className={mode === "create" ? "active" : ""}
                      onClick={() => setMode("create")}
                    >
                      Start a chat
                    </button>
                    <button
                      className={mode === "join" ? "active" : ""}
                      onClick={() => setMode("join")}
                    >
                      Join the mess
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      enter({
                        name,
                        title,
                        avatar,
                        ...(mode === "join" ? { code } : {}),
                      });
                    }}
                  >
                    <label htmlFor="name">WHAT SHOULD WE CALL YOU?</label>
                    <input
                      id="name"
                      value={name}
                      maxLength={20}
                      required
                      autoComplete="nickname"
                      placeholder="Your alias, not your government"
                      onChange={(e) => setName(e.target.value)}
                    />
                    <label>CHOOSE YOUR ENERGY</label>
                    <div className="avatar-picker">
                      {avatars.map((emoji, i) => (
                        <button
                          aria-label={`Avatar ${i + 1}: ${emoji}`}
                          aria-pressed={avatar === i}
                          className={avatar === i ? "selected" : ""}
                          type="button"
                          key={i}
                          onClick={() => setAvatar(i)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <div className="title-picker">
                      {titles.map((t) => (
                        <button
                          aria-pressed={title === t}
                          type="button"
                          key={t}
                          className={title === t ? "selected" : ""}
                          onClick={() => setTitle(t)}
                        >
                          {t}
                          {title === t && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                    {mode === "join" && (
                      <>
                        <label htmlFor="code">THE FOUR-DIGIT CODE</label>
                        <input
                          id="code"
                          className="code-input"
                          inputMode="numeric"
                          pattern="[0-9]{4}"
                          maxLength={4}
                          required
                          value={code}
                          onChange={(e) =>
                            setCode(e.target.value.replace(/\D/g, ""))
                          }
                          placeholder="0000"
                        />
                      </>
                    )}
                    <button
                      disabled={busy || !connected}
                      className="btn primary enter"
                      type="submit"
                    >
                      {busy
                        ? "Opening the chat…"
                        : mode === "create"
                          ? "Create the group chat"
                          : "I’m here for the drama"}
                      <ArrowUpRight size={20} />
                    </button>
                  </form>
                  <div className="entry-note">
                    <Shield size={14} /> Private rooms. Public-level chaos.
                  </div>
                </section>
              </div>
              <section className="how-strip">
                <div>
                  <span>01 /</span>
                  <b>DO YOUR TASKS.</b>
                  <p>Campus won’t save itself.</p>
                </div>
                <div>
                  <span>02 /</span>
                  <b>CLOCK THE CHAOS.</b>
                  <p>Your bestie is looking suspicious.</p>
                </div>
                <div>
                  <span>03 /</span>
                  <b>DROP THE RECEIPTS.</b>
                  <p>Vote them out. Screenshot the aftermath.</p>
                </div>
              </section>
            </>
          ) : room.phase === "lobby" ? (
            <Lobby room={room} send={act} />
          ) : room.phase === "ended" ? (
            <Recap room={room} rematch={() => act({ type: "rematch" })} />
          ) : room.phase === "ejection" ? (
            <section className="ejection">
              <div className="eyebrow">THE TRIBUNAL HAS SPOKEN</div>
              <motion.div
                animate={
                  reduced ? {} : { rotate: [-8, 8, -8], scale: [1, 1.1, 1] }
                }
                transition={{ repeat: Infinity, duration: 2 }}
                className="eject-emoji"
              >
                {room.ejected ? (
                  <Avatar
                    index={
                      room.players.find((p) => p.id === room.ejected)!.avatar
                    }
                  />
                ) : (
                  <span>🤷🏾</span>
                )}
              </motion.div>
              <h2>{room.verdict}</h2>
              <p>
                {room.ejected
                  ? `${room.players.find((p) => p.id === room.ejected)!.name} has left the conversation.`
                  : "Keep your eyes open. The mess is still in here."}
              </p>
              <span className="muted">
                The chat resumes in {seconds(room.deadline, room.now)}s
              </span>
            </section>
          ) : (
            <Round room={room} send={act} />
          )}
        </motion.div>
      </AnimatePresence>
      <footer className="site-footer">
        <span>BUILT FOR THE CULTURE. PLAYED FOR THE PLOT.</span>
        <span>
          A campus social deduction game <span className="text-hot">✳</span>
        </span>
      </footer>
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="icon-btn float-right"
              aria-label="Close instructions"
              onClick={() => setHelp(false)}
            >
              <X />
            </button>
            <h2 id="help-title">Save the chat.</h2>
            <p>
              Gather 4–10 friends on their own devices. Share your four-digit
              code.
            </p>
            <ol>
              <li>
                <b>Crew:</b> move between campus rooms and complete all three
                tasks.
              </li>
              <li>
                <b>Chaos:</b> fake being helpful. Lock rooms, change the banner,
                and expose everyone’s location. Receipts shave 10 seconds off
                the round.
              </li>
              <li>
                <b>Tribunal:</b> discuss out loud or in the chat’s reaction
                feed. Each player gets one vote. A tie or skip ejects nobody.
              </li>
              <li>
                <b>Win:</b> crew finishes every required task or ejects all
                chaos agents. Chaos wins by surviving the timer or reaching
                equal numbers with crew.
              </li>
            </ol>
            <p className="muted">
              Eliminated players spectate. Roles are revealed after the round.
              Refreshing in the same tab reconnects you.
            </p>
            <button className="btn primary mt-5" onClick={() => setHelp(false)}>
              Got it. Let’s be messy.
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
