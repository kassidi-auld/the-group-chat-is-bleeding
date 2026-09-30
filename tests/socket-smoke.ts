/** Run against npm start: node --import tsx tests/socket-smoke.ts */
import assert from "node:assert/strict";
import { io, type Socket } from "socket.io-client";
import type { Ack, RoomView } from "../lib/types";
const sockets: Socket[] = [];
const snapshots = new Map<Socket, RoomView>();
function waitFor(check: () => boolean) {
  return new Promise<void>((resolve, reject) => {
    const deadline = Date.now() + 8000;
    const timer = setInterval(() => {
      if (check()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() > deadline) {
        clearInterval(timer);
        reject(Error("Snapshot timed out"));
      }
    }, 25);
  });
}
async function player(name: string, code?: string) {
  const s = io(process.env.SMOKE_ORIGIN ?? "http://localhost:3000", {
    forceNew: true,
    transports: ["websocket"],
  });
  sockets.push(s);
  s.on("state", (r: RoomView) => snapshots.set(s, r));
  await new Promise<void>((resolve, reject) => {
    s.on("connect", () => resolve());
    s.on("connect_error", reject);
  });
  const ack = (await s
    .timeout(5000)
    .emitWithAck("join", {
      name,
      title: "Main Character",
      avatar: 0,
      ...(code ? { code } : {}),
    })) as Ack;
  assert.equal(ack.ok, true, ack.error);
  return { s, code: ack.code! };
}
try {
  const host = await player("Host");
  await player("Bestie", host.code);
  await player("Hater", host.code);
  await player("Scholar", host.code);
  await waitFor(() => snapshots.get(host.s)?.players.length === 4);
  const ack = await host.s
    .timeout(5000)
    .emitWithAck("command", { type: "start" });
  assert.equal(ack.ok, true);
  await waitFor(() =>
    sockets.every((s) => snapshots.get(s)?.phase === "playing"),
  );
  assert.equal(
    sockets.filter((s) => snapshots.get(s)?.role === "chaos").length,
    1,
  );
  for (const s of sockets) {
    assert.equal(snapshots.get(s)!.roles, undefined);
    assert.equal(snapshots.get(s)!.tasks.length, 3);
  }
  console.log(
    "PASS: four independent WebSocket clients join, start, sync, and receive private roles.",
  );
} finally {
  for (const s of sockets) s.disconnect();
}
