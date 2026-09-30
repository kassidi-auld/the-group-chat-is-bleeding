import { randomInt, randomUUID } from "node:crypto";
import {
  locations,
  type Player,
  type Role,
  type Phase,
  type Challenge,
  type RoomView,
  type Command,
  type Feed,
  type Join,
} from "../lib/types";
interface SecretTask extends Challenge {
  answer: number;
  startedAt: number;
}
export interface Room {
  code: string;
  hostId: string;
  phase: Phase;
  revision: number;
  players: Map<string, Player>;
  tokens: Map<string, string>;
  roles: Map<string, Role>;
  tasks: Map<string, SecretTask[]>;
  completed: Map<string, Set<string>>;
  deadline: number;
  gameDeadline: number;
  progress: number;
  goal: number;
  votes: Map<string, string>;
  feed: Feed[];
  banner: string;
  lockUntil: number;
  cooldowns: Map<string, number>;
  meetingCooldown: number;
  winner?: Role;
  ejected?: string;
  verdict?: string;
  updatedAt: number;
}
const fail = (message: string): never => {
  throw new Error(message);
};
export function log(r: Room, text: string, emoji = "💬", now = Date.now()) {
  r.feed.push({ id: randomUUID(), text, emoji, at: now });
  r.feed = r.feed.slice(-40);
}
export function createRoom(code: string, now = Date.now()): Room {
  return {
    code,
    hostId: "",
    phase: "lobby",
    revision: 0,
    players: new Map(),
    tokens: new Map(),
    roles: new Map(),
    tasks: new Map(),
    completed: new Map(),
    deadline: 0,
    gameDeadline: 0,
    progress: 0,
    goal: 0,
    votes: new Map(),
    feed: [],
    banner: "THE GROUP CHAT IS BLEEDING",
    lockUntil: 0,
    cooldowns: new Map(),
    meetingCooldown: 0,
    updatedAt: now,
  };
}
export function join(r: Room, input: Join, now = Date.now()) {
  if (input.token) {
    const id = r.tokens.get(input.token);
    if (id) {
      const p = r.players.get(id)!;
      p.connected = true;
      r.revision++;
      return { id, token: input.token };
    }
  }
  if (r.phase !== "lobby")
    fail("This chat already started. Rejoin with your original browser.");
  if (r.players.size >= 10) fail("The chat is full (10 players max).");
  const id = randomUUID(),
    token = randomUUID();
  const p: Player = {
    id,
    name: input.name,
    title: input.title,
    avatar: input.avatar,
    alive: true,
    connected: true,
    location: "The Yard",
    tasks: 0,
    votesReceived: 0,
    disruptions: 0,
    meetings: 0,
  };
  r.players.set(id, p);
  r.tokens.set(token, id);
  if (!r.hostId) r.hostId = id;
  log(r, `${p.name} entered the chat.`, "✨", now);
  r.revision++;
  return { id, token };
}
function makeTasks(now: number): SecretTask[] {
  return ["aid", "paper", "tickets"].map((kind, index) => {
    const variants =
      kind === "aid"
        ? [
            ["Student ID", "Missing signature", "Unverified income"],
            0,
            "Select the document that clears your verification.",
          ]
        : kind === "paper"
          ? [
              ["Trust me bro", "A cited source", "A vibes-based conclusion"],
              1,
              "Your paper is due. Pick a credible citation.",
            ]
          : [
              [
                "Refresh 40 tabs",
                "Buy from the official portal",
                "DM a stranger your password",
              ],
              1,
              "Secure homecoming tickets without getting scammed.",
            ];
    const choices = variants[0] as string[];
    const original = variants[1] as number;
    const correct = choices[original];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return {
      id: randomUUID(),
      kind: kind as Challenge["kind"],
      location: locations[index + 1],
      prompt: variants[2] as string,
      choices,
      answer: choices.indexOf(correct),
      startedAt: 0,
      expiresAt: now + 240000,
    };
  });
}
function finish(r: Room, winner: Role, now: number) {
  r.phase = "ended";
  r.winner = winner;
  r.deadline = 0;
  log(
    r,
    winner === "crew"
      ? "The chat survived. The receipts were RECEIPTING."
      : "Chaos won. This could have been a private message.",
    winner === "crew" ? "🏆" : "🩸",
    now,
  );
}
function checkWin(r: Room, now: number) {
  const alive = [...r.players.values()].filter((p) => p.alive);
  const chaos = alive.filter((p) => r.roles.get(p.id) === "chaos").length;
  if (!chaos) finish(r, "crew", now);
  else if (chaos >= alive.length - chaos) finish(r, "chaos", now);
  else if (r.progress >= r.goal) finish(r, "crew", now);
}
export function command(r: Room, id: string, c: Command, now = Date.now()) {
  tick(r, now);
  const p = r.players.get(id) ?? fail("Player missing.");
  if (c.type === "remove") {
    if (id !== r.hostId || r.phase !== "lobby")
      fail("Only the lobby host can remove an away player.");
    const target = r.players.get(c.target) ?? fail("Unknown player.");
    if (target.connected) fail("Only disconnected players can be removed.");
    r.players.delete(c.target);
    for (const [token, playerId] of r.tokens)
      if (playerId === c.target) r.tokens.delete(token);
    log(r, `${target.name} was removed from the lobby.`, "👋", now);
    r.revision++;
    r.updatedAt = now;
    return;
  }
  if (c.type === "start" || c.type === "rematch") {
    if (id !== r.hostId) fail("Only the host can do that.");
    if (c.type === "rematch") {
      if (r.phase !== "ended") fail("Finish this round first.");
      r.phase = "lobby";
      r.roles.clear();
      r.tasks.clear();
      r.completed.clear();
      r.winner = undefined;
      r.ejected = undefined;
      r.verdict = undefined;
      r.banner = "THE GROUP CHAT IS BLEEDING";
      r.progress = 0;
      r.goal = 0;
      r.lockUntil = 0;
      r.votes.clear();
      r.cooldowns.clear();
      r.meetingCooldown = 0;
      r.deadline = 0;
      for (const x of r.players.values()) {
        x.alive = true;
        x.tasks = 0;
        x.votesReceived = 0;
        x.disruptions = 0;
        x.meetings = 0;
        x.location = "The Yard";
      }
      r.revision++;
      return;
    }
    if (r.phase !== "lobby") fail("The round has already started.");
    const all = [...r.players.values()];
    if (all.length < 4 || all.some((x) => !x.connected))
      fail("You need 4–10 connected players.");
    const shuffled = [...all];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const count = all.length >= 7 ? 2 : 1;
    shuffled.forEach((x, i) => {
      r.roles.set(x.id, i < count ? "chaos" : "crew");
      r.tasks.set(x.id, makeTasks(now));
      r.completed.set(x.id, new Set());
    });
    r.goal = (all.length - count) * 3;
    r.phase = "playing";
    r.gameDeadline = now + 240000;
    r.deadline = r.gameDeadline;
    r.meetingCooldown = now + 15000;
    log(r, "Roles assigned. Somebody is moving suspicious.", "👀", now);
  } else {
    if (!p.alive) fail("You’ve been blocked. Enjoy the receipts.");
    if (c.type === "react") {
      if (r.phase !== "meeting") fail("Save that reaction for the tribunal.");
      log(r, `${p.name}: ${c.emoji}`, c.emoji, now);
    } else if (c.type === "vote") {
      if (r.phase !== "meeting") fail("No tribunal is open.");
      if (r.votes.has(id)) fail("Your vote is already locked.");
      if (c.target !== "skip" && !r.players.get(c.target)?.alive)
        fail("Invalid vote.");
      r.votes.set(id, c.target);
      if (
        [...r.players.values()]
          .filter((x) => x.alive)
          .every((x) => r.votes.has(x.id))
      )
        resolveVote(r, now);
    } else {
      if (r.phase !== "playing") fail("Wait for the round to resume.");
      if (c.type === "move") {
        if (r.lockUntil > now) fail("Rooms are locked. Wait for the timer.");
        p.location = c.location;
        for (const t of r.tasks.get(id) ?? [])
          if (t.location === p.location && !t.startedAt) t.startedAt = now;
      }
      if (c.type === "task") {
        if (r.roles.get(id) !== "crew")
          fail("Chaos agents can only fake tasks.");
        const t =
          r.tasks.get(id)?.find((t) => t.id === c.id) ?? fail("Unknown task.");
        if (r.completed.get(id)!.has(t.id)) fail("Task already submitted.");
        if (p.location !== t.location || r.lockUntil > now)
          fail("Get to the task room first.");
        if (!t.startedAt || now - t.startedAt < 1800)
          fail("Read the task first.");
        if (t.expiresAt < now) fail("That deadline passed.");
        if (c.answer !== t.answer)
          fail("That’s not it. Read the choices and try again.");
        r.completed.get(id)!.add(t.id);
        p.tasks++;
        r.progress++;
        log(r, `A task was cleared in ${p.location}.`, "✅", now);
        checkWin(r, now);
      }
      if (c.type === "meeting") {
        if (p.meetings >= 2 || r.meetingCooldown > now)
          fail("The tribunal is on cooldown (two calls per player).");
        p.meetings++;
        r.phase = "meeting";
        r.deadline = now + 30000;
        r.votes.clear();
        log(r, `${p.name} called an emergency tribunal.`, "🚨", now);
      }
      if (c.type === "sabotage") {
        if (r.roles.get(id) !== "chaos") fail("You’re crew. Stay focused.");
        if ((r.cooldowns.get(id) ?? 0) > now)
          fail("Your chaos is on cooldown.");
        r.cooldowns.set(id, now + 20000);
        p.disruptions++;
        if (c.kind === "lockdown") {
          r.lockUntil = now + 10000;
          log(r, "Campus lockdown. Nobody is going anywhere.", "🔒", now);
        }
        if (c.kind === "banner") {
          r.banner = "EVERYBODY IN THIS CHAT IS DOING BAD";
          log(r, "Someone changed the banner. The disrespect.", "🎭", now);
        }
        if (c.kind === "receipts") {
          log(
            r,
            "RECEIPTS EXPOSED: " +
              [...r.players.values()]
                .filter((x) => x.alive)
                .map((x) => `${x.name} → ${x.location}`)
                .join(" · "),
            "🧾",
            now,
          );
          r.gameDeadline = Math.max(now + 1000, r.gameDeadline - 10000);
          r.deadline = r.gameDeadline;
        }
      }
    }
  }
  r.revision++;
  r.updatedAt = now;
}
function resolveVote(r: Room, now: number) {
  const tally = new Map<string, number>();
  for (const target of r.votes.values()) {
    tally.set(target, (tally.get(target) ?? 0) + 1);
    if (target !== "skip") r.players.get(target)!.votesReceived++;
  }
  const sorted = [...tally].sort((a, b) => b[1] - a[1]);
  const winner = sorted[0];
  r.ejected = undefined;
  if (
    winner &&
    winner[0] !== "skip" &&
    (!sorted[1] || winner[1] > sorted[1][1])
  ) {
    r.ejected = winner[0];
    r.players.get(winner[0])!.alive = false;
    if (r.roles.get(winner[0]) === "crew")
      r.goal -= 3 - (r.completed.get(winner[0])?.size ?? 0);
    r.verdict = ["DRAGGED", "BLOCKED & REPORTED", "SENT TO THE BASEMENT"][
      randomInt(3)
    ];
    log(
      r,
      `${r.players.get(winner[0])!.name} was ${r.verdict.toLowerCase()}.`,
      "💀",
      now,
    );
  } else {
    r.verdict = "THE CHAT COULDN’T AGREE";
    log(r, "Tie or skip. Nobody was blocked.", "🤷🏾", now);
  }
  r.phase = "ejection";
  r.deadline = now + 5000;
}
export function tick(r: Room, now = Date.now()) {
  const before = r.phase;
  if (r.phase === "meeting" && now >= r.deadline) resolveVote(r, now);
  else if (r.phase === "ejection" && now >= r.deadline) {
    checkWin(r, now);
    if ((r.phase as Phase) !== "ended") {
      r.phase = "playing";
      r.deadline = r.gameDeadline;
      r.meetingCooldown = now + 20000;
    }
  }
  if (r.phase === "playing" && now >= r.gameDeadline) finish(r, "chaos", now);
  if (before !== r.phase) {
    r.revision++;
    r.updatedAt = now;
  }
}
export function view(r: Room, id: string, now = Date.now()): RoomView {
  return {
    code: r.code,
    hostId: r.hostId,
    phase: r.phase,
    revision: r.revision,
    players: [...r.players.values()],
    me: r.players.get(id)!,
    role: r.roles.get(id),
    tasks: (r.tasks.get(id) ?? []).map(
      ({ answer, startedAt, ...task }) => task,
    ),
    completed: [...(r.completed.get(id) ?? [])],
    progress: r.progress,
    goal: r.goal,
    deadline: r.deadline,
    now,
    banner: r.banner,
    lockUntil: r.lockUntil,
    cooldownUntil: r.cooldowns.get(id) ?? 0,
    meetingCooldown: r.meetingCooldown,
    votes:
      r.phase === "meeting"
        ? Object.fromEntries([...r.votes.keys()].map((k) => [k, "locked"]))
        : Object.fromEntries(r.votes),
    feed: r.feed,
    winner: r.winner,
    ejected: r.ejected,
    verdict: r.verdict,
    roles: r.phase === "ended" ? Object.fromEntries(r.roles) : undefined,
  };
}
