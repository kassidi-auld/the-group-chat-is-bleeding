# The Group Chat is Bleeding

A mobile-first campus social deduction game by an HBCU computer science scholar. Next.js App Router + TypeScript + Tailwind + Framer Motion + Socket.IO. No account, app download, or paid service required.

## Run

Node 22+ recommended.

```sh
npm ci
npm run dev
# Open http://localhost:3000
```

Create a room; share the four-digit code. Open four separate browsers/devices to start. For phones on your Wi-Fi, use your computer’s LAN IP and port 3000. Each device needs a unique player session. Session storage resumes a player after refresh in the same tab. A reconnect token is a bearer credential: do not share it.

```sh
npm test
npm run typecheck
npm run build
APP_ORIGIN=https://your-domain.example npm start
```

Deploy the Docker container to a host with persistent Node processes and WebSocket support (e.g., a VPS or container platform). Terminate HTTPS at a reverse proxy that forwards WebSocket upgrades. Set APP_ORIGIN to the exact public origin. Health check: GET /healthz. Do not deploy this custom server as a static export or an ephemeral function.

## Architecture

```text
app/
  layout.tsx              Metadata, viewport, global shell
  page.tsx                App entry
  globals.css             Mobile design system + Tailwind
components/
  game.tsx                Entry, lobby, map, tribunal, ejection
  lobby.tsx               Roster, room invitation, host controls
  round.tsx               Campus map, tasks and voting
  avatar.tsx              Avatar identity system
  recap.tsx               PNG download + native file sharing
lib/
  types.ts                Shared public protocol
  use-game.ts             Socket lifecycle, ACKs, reconnect
  sound.ts                Gesture-enabled synthesized audio
server/
  index.ts                Next HTTP + Socket.IO, validation, rate limits
  engine.ts               Authoritative state machine and private projections
tests/engine.test.ts     Rules, privacy, timers, idempotency tests
```

## Rules

4–6 players: one chaos agent. 7–10: two. Roles use a cryptographic shuffle and remain private until the final recap. Crew finishes three tasks each by moving to the correct room and answering its shuffled micro-task. Crew wins by clearing the task target or ejecting all chaos agents. Chaos wins at parity or after the four-minute clock expires.

Chaos can change the banner, expose everybody’s current location (and remove 10 seconds from the timer), or lock movement and tasks for 10 seconds. Each sabotage triggers a shared 20-second player cooldown. Players may call two meetings per round, with a room-wide cooldown. Tribunals last 30 seconds; each living player has one immutable vote. Unique plurality ejects a player; ties and a winning skip spare everyone. Ejected crew’s unfinished tasks are removed from the target so remaining crew can still win. Meeting time counts toward the round clock; ejections resolve before the timer outcome.

## State and security

All commands validate on the server. Room mutations execute synchronously, without `await`, on one Node event loop. Start, vote, task, and phase guards reject duplicated or stale actions. Task answers and other players’ roles never enter public snapshots. The server owns deadlines, task progress, RNG, cooldowns, and outcomes. Clients receive a full private projection every second and after changes, avoiding missed-event divergence.

Connections use same-origin validation, strict join schemas, bounded command fields, 8 KB payload limits, a per-connection token bucket, and a 1,000-room cap. UI renders player strings as text, not HTML. Reconnect credentials are random UUIDs, stored per browser tab; a replacement connection disconnects the old socket. Four-digit room codes are an invitation convenience, not a security boundary. Rate limiting is per connection; put an IP-aware limit at your edge for a public launch. No client optimistic mutation of authoritative state.

## Honest deployment limits

This is a complete playable single-process implementation, not a claim of mathematically zero race conditions or unlimited scale. Room state is in memory: restarting the process loses active games. Disconnected players remain in rounds; they can reconnect and vote before timeout. In a lobby the host transfers to a connected player when disconnected. The host can remove disconnected lobby players before starting.

For a large competition/public launch, run load tests, add metrics and IP-level abuse prevention, and choose a persistence policy. Multiple replicas require **one authoritative owner per room** (consistent routing or distributed actors) plus a durable store; merely adding a Socket.IO Redis adapter does not synchronize these room Maps. Use graceful draining instead of restarting a process mid-round. No persistent identity, paid matchmaking, chat moderation service, analytics, or OAuth is included.

Tasks are rapid choice-based scenarios with shuffled answers; they are not secure against automated cheating. Audio is optional and browsers can restrict autoplay. PNG export falls back to download when file sharing is unavailable. All core controls use labels and keyboard-accessible buttons. Reduced motion is supported. A full accessibility audit, load test, and deployment smoke test are still required before claiming production readiness.

## Customization

Edit `titles` and `locations` in `lib/types.ts`, task scenarios in `server/engine.ts`, and visual tokens in `app/globals.css` and `tailwind.config.ts`. No external fonts, images, or audio files are needed; emoji appearance varies by operating system.

## Verification in this build

12 engine tests passed. TypeScript checking and optimized Next.js production build passed. Four real independent WebSocket clients joined, started, synchronized, and received private roles in the socket smoke test. Browser visual QA could not run because the Chromium download failed in the execution environment.
