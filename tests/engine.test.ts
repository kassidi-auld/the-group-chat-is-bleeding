import { test } from "node:test";
import assert from "node:assert/strict";
import { createRoom, join, command, tick, view } from "../server/engine";
function setup(n = 4) {
  const r = createRoom("1234", 1000);
  const ids = Array.from(
    { length: n },
    (_, i) =>
      join(r, { name: `Player ${i}`, title: "Main Character", avatar: i }, 1000)
        .id,
  );
  command(r, ids[0], { type: "start" }, 1000);
  return {
    r,
    ids,
    chaos: ids.filter((id) => r.roles.get(id) === "chaos"),
    crew: ids.filter((id) => r.roles.get(id) === "crew"),
  };
}
test("requires four players and host authorization", () => {
  const r = createRoom("1234");
  const a = join(r, { name: "A", title: "Doing Bad", avatar: 0 }),
    b = join(r, { name: "B", title: "Doing Bad", avatar: 1 });
  assert.throws(() => command(r, b.id, { type: "start" }), /host/);
  assert.throws(() => command(r, a.id, { type: "start" }), /4–10/);
});
test("private view never leaks other roles or task answers", () => {
  const { r, crew } = setup();
  const v = view(r, crew[0]);
  assert.equal(v.roles, undefined);
  assert.equal(
    v.players.some((p) => "role" in p),
    false,
  );
  assert.equal(
    v.tasks.some((t) => "answer" in t || "startedAt" in t),
    false,
  );
});
test("duplicate task submissions cannot double count", () => {
  const { r, crew } = setup();
  const id = crew[0],
    t = r.tasks.get(id)![0];
  command(r, id, { type: "move", location: t.location }, 2000);
  assert.throws(
    () => command(r, id, { type: "task", id: t.id, answer: t.answer }, 2100),
    /Read/,
  );
  command(r, id, { type: "task", id: t.id, answer: t.answer }, 4000);
  assert.throws(
    () => command(r, id, { type: "task", id: t.id, answer: t.answer }, 4001),
    /already/,
  );
  assert.equal(r.progress, 1);
});
test("chaos cannot complete crew tasks; crew cannot sabotage", () => {
  const { r, crew, chaos } = setup();
  assert.throws(
    () => command(r, crew[0], { type: "sabotage", kind: "lockdown" }, 2000),
    /crew/,
  );
  assert.throws(
    () =>
      command(
        r,
        chaos[0],
        { type: "task", id: r.tasks.get(chaos[0])![0].id, answer: 0 },
        2000,
      ),
    /fake/,
  );
});
test("lockdown blocks movement and cooldown stops repeat sabotage", () => {
  const { r, chaos, crew } = setup();
  command(r, chaos[0], { type: "sabotage", kind: "lockdown" }, 2000);
  assert.throws(
    () => command(r, crew[0], { type: "move", location: "Library" }, 2001),
    /locked/,
  );
  assert.throws(
    () => command(r, chaos[0], { type: "sabotage", kind: "banner" }, 2001),
    /cooldown/,
  );
});
test("vote is immutable and all votes resolve once; chaos ejection wins", () => {
  const { r, ids, crew, chaos } = setup();
  command(r, crew[0], { type: "meeting" }, 20000);
  command(r, ids[0], { type: "vote", target: chaos[0] }, 21000);
  assert.throws(
    () => command(r, ids[0], { type: "vote", target: "skip" }, 21001),
    /locked/,
  );
  for (const id of ids.slice(1))
    command(r, id, { type: "vote", target: chaos[0] }, 22000);
  assert.equal(r.phase, "ejection");
  tick(r, 28000);
  assert.equal(r.winner, "crew");
  assert.equal(view(r, crew[0]).roles?.[chaos[0]], "chaos");
});
test("tied votes spare everyone and meeting timeout is deterministic", () => {
  const { r, ids, crew } = setup();
  command(r, crew[0], { type: "meeting" }, 20000);
  command(r, ids[0], { type: "vote", target: ids[1] }, 21000);
  command(r, ids[1], { type: "vote", target: ids[0] }, 21000);
  tick(r, 50000);
  assert.equal(r.ejected, undefined);
  assert.equal(r.phase, "ejection");
  tick(r, 56000);
  assert.equal(r.phase, "playing");
});
test("game deadline grants chaos victory", () => {
  const { r } = setup();
  tick(r, 242000);
  assert.equal(r.winner, "chaos");
});
test("token reconnect retains identity without growing roster", () => {
  const r = createRoom("1234");
  const input = { name: "A", title: "Doing Bad", avatar: 0 };
  const a = join(r, input);
  r.players.get(a.id)!.connected = false;
  const b = join(r, { ...input, token: a.token });
  assert.equal(a.id, b.id);
  assert.equal(r.players.size, 1);
});
test("crew can win by finishing tasks", () => {
  const { r, crew } = setup();
  let now = 2000;
  for (const id of crew)
    for (const task of r.tasks.get(id)!) {
      command(r, id, { type: "move", location: task.location }, now);
      now += 2000;
      command(r, id, { type: "task", id: task.id, answer: task.answer }, now);
    }
  assert.equal(r.winner, "crew");
});
test("rematch clears roles, scores, sabotage and votes", () => {
  const { r, ids } = setup();
  tick(r, 242000);
  command(r, ids[0], { type: "rematch" }, 243000);
  assert.equal(r.phase, "lobby");
  assert.equal(r.roles.size, 0);
  assert.equal(r.progress, 0);
  assert.equal(r.goal, 0);
});

test("only host can remove disconnected lobby members", () => {
  const r = createRoom("4321");
  const a = join(r, { name: "Host", title: "Main Character", avatar: 0 });
  const b = join(r, { name: "Away", title: "Doing Bad", avatar: 1 });
  assert.throws(
    () => command(r, a.id, { type: "remove", target: b.id }),
    /disconnected/,
  );
  r.players.get(b.id)!.connected = false;
  assert.throws(
    () => command(r, b.id, { type: "remove", target: a.id }),
    /host/,
  );
  command(r, a.id, { type: "remove", target: b.id });
  assert.equal(r.players.has(b.id), false);
  assert.equal(r.tokens.has(b.token), false);
});
