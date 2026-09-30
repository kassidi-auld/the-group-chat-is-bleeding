export const titles = [
  "Main Character",
  "Certified Hater",
  "Chronically Online",
  "Doing Bad",
] as const;
export const locations = [
  "The Yard",
  "Financial Aid",
  "Library",
  "Homecoming",
  "The Basement",
] as const;
export type Location = (typeof locations)[number];
export type Phase = "lobby" | "playing" | "meeting" | "ejection" | "ended";
export type Role = "crew" | "chaos";
export type TaskKind = "aid" | "paper" | "tickets";
export type Sabotage = "banner" | "receipts" | "lockdown";
export interface Player {
  id: string;
  name: string;
  title: string;
  avatar: number;
  alive: boolean;
  connected: boolean;
  location: Location;
  tasks: number;
  votesReceived: number;
  disruptions: number;
  meetings: number;
}
export interface Challenge {
  id: string;
  kind: TaskKind;
  location: Location;
  prompt: string;
  choices: string[];
  expiresAt: number;
}
export interface Feed {
  id: string;
  text: string;
  at: number;
  emoji: string;
}
export interface RoomView {
  code: string;
  hostId: string;
  phase: Phase;
  revision: number;
  players: Player[];
  me: Player;
  role?: Role;
  tasks: Challenge[];
  completed: string[];
  progress: number;
  goal: number;
  deadline: number;
  now: number;
  banner: string;
  lockUntil: number;
  cooldownUntil: number;
  meetingCooldown: number;
  votes: Record<string, string>;
  feed: Feed[];
  winner?: Role;
  ejected?: string;
  verdict?: string;
  roles?: Record<string, Role>;
}
export type Command =
  | { type: "start" }
  | { type: "remove"; target: string }
  | { type: "move"; location: Location }
  | { type: "task"; id: string; answer: number }
  | { type: "sabotage"; kind: Sabotage }
  | { type: "meeting" }
  | { type: "vote"; target: string }
  | { type: "react"; emoji: string }
  | { type: "rematch" };
export interface Join {
  code?: string;
  name: string;
  title: string;
  avatar: number;
  token?: string;
}
export interface Ack {
  ok: boolean;
  error?: string;
  token?: string;
  code?: string;
}
