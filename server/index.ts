import next from "next";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { command, createRoom, join, tick, view, type Room } from "./engine";
import { locations, titles, type Command } from "../lib/types";
const port = Number(process.env.PORT ?? 3000),
  dev = process.env.NODE_ENV !== "production";
const app = next({ dev, hostname: "0.0.0.0", port });
await app.prepare();
const http = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200);
    res.end("ok");
    return;
  }
  void app.getRequestHandler()(req, res);
});
const allowed = process.env.APP_ORIGIN;
const io = new Server(http, {
  maxHttpBufferSize: 8192,
  allowRequest: (req, cb) => {
    const origin = req.headers.origin;
    cb(
      null,
      !origin ||
        (allowed
          ? origin === allowed
          : origin === `http://${req.headers.host}` ||
            origin === `https://${req.headers.host}`),
    );
  },
});
const rooms = new Map<string, Room>();
const bindings = new Map<string, string>();
const joinSchema = z
  .object({
    code: z
      .string()
      .regex(/^\d{4}$/)
      .optional(),
    name: z.string().trim().min(1).max(20),
    title: z.enum(titles),
    avatar: z.number().int().min(0).max(7),
    token: z.string().uuid().optional(),
  })
  .strict();
const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("remove"), target: z.string().uuid() }),
  z.object({ type: z.literal("rematch") }),
  z.object({ type: z.literal("move"), location: z.enum(locations) }),
  z.object({
    type: z.literal("task"),
    id: z.string().uuid(),
    answer: z.number().int().min(0).max(2),
  }),
  z.object({
    type: z.literal("sabotage"),
    kind: z.enum(["banner", "receipts", "lockdown"]),
  }),
  z.object({ type: z.literal("meeting") }),
  z.object({ type: z.literal("vote"), target: z.string().max(36) }),
  z.object({
    type: z.literal("react"),
    emoji: z.enum(["😭", "👀", "🧾", "💀", "🗣️", "🍅"]),
  }),
]);
function broadcast(r: Room) {
  for (const socket of io.sockets.sockets.values())
    if (socket.data.code === r.code && r.players.has(socket.data.playerId))
      socket.emit("state", view(r, socket.data.playerId));
}
io.on("connection", (socket) => {
  let bucket = 20,
    last = Date.now();
  const rate = () => {
    const now = Date.now();
    bucket = Math.min(20, bucket + (now - last) / 500);
    last = now;
    if (bucket < 1) throw Error("Slow down. Let the chat breathe.");
    bucket--;
  };
  socket.on("join", (raw, ack) => {
    if (typeof ack !== "function") return;
    try {
      rate();
      if (socket.data.code) throw Error("You are already in a room.");
      const input = joinSchema.parse(raw);
      if (!input.code && rooms.size >= 1000)
        throw Error("Campus is full. Try again shortly.");
      let code = input.code;
      if (!code) {
        do {
          code = String(randomInt(1000, 10000));
        } while (rooms.has(code));
        rooms.set(code, createRoom(code));
      }
      const r = rooms.get(code);
      if (!r) throw Error("That room code doesn’t exist.");
      const result = join(r, input);
      const key = code + result.id;
      const previous = bindings.get(key);
      if (previous && previous !== socket.id) {
        const old = io.sockets.sockets.get(previous);
        if (old) {
          old.emit("superseded");
          old.disconnect(true);
        }
      }
      bindings.set(key, socket.id);
      socket.data.code = code;
      socket.data.playerId = result.id;
      ack({ ok: true, token: result.token, code });
      broadcast(r);
    } catch (e) {
      ack({
        ok: false,
        error:
          e instanceof z.ZodError
            ? "Check your name and room code."
            : (e as Error).message,
      });
    }
  });
  socket.on("command", (raw, ack) => {
    if (typeof ack !== "function") return;
    try {
      rate();
      const r = rooms.get(socket.data.code);
      if (!r || bindings.get(r.code + socket.data.playerId) !== socket.id)
        throw Error("Reconnect to the chat.");
      command(r, socket.data.playerId, commandSchema.parse(raw) as Command);
      ack({ ok: true });
      broadcast(r);
    } catch (e) {
      ack({
        ok: false,
        error:
          e instanceof z.ZodError
            ? "Invalid game action."
            : (e as Error).message,
      });
    }
  });
  socket.on("disconnect", () => {
    const r = rooms.get(socket.data.code);
    if (!r || bindings.get(r.code + socket.data.playerId) !== socket.id) return;
    bindings.delete(r.code + socket.data.playerId);
    const p = r.players.get(socket.data.playerId);
    if (p) p.connected = false;
    r.revision++;
    r.updatedAt = Date.now();
    if (r.phase === "lobby") {
      const connected = [...r.players.values()].find((p) => p.connected);
      if (connected) r.hostId = connected.id;
    }
    broadcast(r);
  });
});
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) {
    if (
      now - r.updatedAt > 1800000 &&
      ![...r.players.values()].some((p) => p.connected)
    ) {
      rooms.delete(code);
      continue;
    }
    tick(r, now);
    broadcast(r);
  }
}, 1000).unref();
http.listen(port, "0.0.0.0", () => console.log(`The chat is live on :${port}`));
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    io.close();
    http.close(() => process.exit(0));
  });
