import { createHash, randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Server } from "node:http";
import type { Socket } from "node:net";

import { logger } from "./lib/logger";

type NodeType = "PAGE" | "HEADING" | "TEXT" | "BUTTON" | "SECTION" | "NAVBAR" | "HERO" | "IMAGE" | "CARD" | "PRICING" | "TESTIMONIAL" | "LOGIN" | "REGISTER" | "DASHBOARD" | "CHAT" | "FOOTER" | "DIVIDER";

type PageNode = {
  id: string;
  type: NodeType;
  label: string;
  content: string;
  lockedBy: string | null;
  position: number;
  lastEditedBy: string;
  x: number;
  y: number;
  width: number;
  tabletX?: number;
  tabletY?: number;
  tabletWidth?: number;
  mobileX?: number;
  mobileY?: number;
  mobileWidth?: number;
};

type ActivityEvent = {
  id: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  outcome: "applied" | "blocked" | "resolved" | "observed";
  timestamp: string;
};

type Collaborator = {
  id: string;
  name: string;
  initials: string;
  accent: string;
  status: "editing" | "watching" | "idle";
  cursor?: { x: number; y: number };
};

type Client = {
  id: string;
  name: string;
  userId?: string;
  socket: Socket;
};

type ClientMessage = {
  type?: string;
  opId?: string;
  clock?: number;
  name?: string;
  userId?: string;
  avatarUrl?: string;
  nodeId?: string;
  field?: "label" | "content";
  value?: string;
  x?: number;
  y?: number;
  width?: number;
  breakpoint?: "desktop" | "tablet" | "mobile";
  nodeType?: Exclude<NodeType, "PAGE">;
  cursor?: { x: number; y: number };
  action?: "lock" | "unlock";
  text?: string;
  whiteboardItem?: WhiteboardItem;
  whiteboardItemId?: string;
};

type ChatMessage = {
  id: string;
  authorId: string;
  author: string;
  text: string;
  timestamp: string;
};

type WhiteboardItem = {
  id: string;
  kind: "sticky" | "text" | "rectangle" | "line" | "draw";
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  points?: Array<{ x: number; y: number }>;
  authorId: string;
};

const accents = ["#177461", "#e1844c", "#8060a3", "#587493"];

const initialNodes: PageNode[] = [
  {
    id: "root",
    type: "PAGE",
    label: "Home page",
    content: "WebCraft Studio",
    lockedBy: null,
    position: 0,
    lastEditedBy: "seed",
    x: 0,
    y: 0,
    width: 100,
  },
  {
    id: "hero",
    type: "HEADING",
    label: "Hero heading",
    content: "Make space for better work.",
    lockedBy: null,
    position: 1,
    lastEditedBy: "seed",
    x: 80,
    y: 90,
    width: 530,
  },
  {
    id: "intro",
    type: "TEXT",
    label: "Intro copy",
    content:
      "A calm workspace for small teams to shape ideas together, without stepping on each other.",
    lockedBy: null,
    position: 2,
    lastEditedBy: "seed",
    x: 82,
    y: 250,
    width: 470,
  },
  {
    id: "cta",
    type: "BUTTON",
    label: "Primary action",
    content: "Start a project",
    lockedBy: null,
    position: 3,
    lastEditedBy: "seed",
    x: 82,
    y: 350,
    width: 180,
  },
  {
    id: "proof",
    type: "SECTION",
    label: "Feature section",
    content: "Built for momentum, designed for clarity.",
    lockedBy: null,
    position: 4,
    lastEditedBy: "seed",
    x: 80,
    y: 450,
    width: 530,
  },
];

const initialEvents: ActivityEvent[] = [
  {
    id: "evt-seed-1",
    actor: "System",
    action: "opened",
    target: "Home page",
    detail: "Shared editing room is ready",
    outcome: "observed",
    timestamp: "now",
  },
];

const nodes = new Map(initialNodes.map((node) => [node.id, node]));
const events: ActivityEvent[] = [...initialEvents];
const clients = new Map<Socket, Client>();
const chatMessages: ChatMessage[] = [];
const whiteboardItems = new Map<string, WhiteboardItem>();
type CrdtValue = string | number | null;
type CrdtStamp = { clock: number; actor: string };
type CrdtRegister = { value: CrdtValue; stamp: CrdtStamp };

// Per-property Lamport registers form the DOM CRDT. The merge rule is
// deterministic regardless of the order in which concurrent operations arrive.
const registers = new Map<string, Map<string, CrdtRegister>>();
const seenOperations = new Set<string>();
let revision = 1;
let lamportClock = 1;

function compareStamps(left: CrdtStamp, right: CrdtStamp) {
  if (left.clock !== right.clock) return left.clock - right.clock;
  return left.actor.localeCompare(right.actor);
}

function stampFor(client: Client, message: ClientMessage): CrdtStamp {
  const requestedClock = typeof message.clock === "number" ? message.clock : 0;
  lamportClock = Math.max(lamportClock, requestedClock) + 1;
  return { clock: lamportClock, actor: client.id };
}

function beginOperation(client: Client, message: ClientMessage) {
  const opId = typeof message.opId === "string" ? message.opId : `${client.id}:${randomUUID()}`;
  if (seenOperations.has(opId)) return null;
  seenOperations.add(opId);
  return { opId, stamp: stampFor(client, message) };
}

function ensureRegisters(node: PageNode) {
  if (registers.has(node.id)) return registers.get(node.id)!;
  const initialStamp = { clock: 0, actor: "seed" };
  const nodeRegisters = new Map<string, CrdtRegister>();
  nodeRegisters.set("label", { value: node.label, stamp: initialStamp });
  nodeRegisters.set("content", { value: node.content, stamp: initialStamp });
  nodeRegisters.set("lockedBy", { value: node.lockedBy, stamp: initialStamp });
  nodeRegisters.set("x", { value: node.x, stamp: initialStamp });
  nodeRegisters.set("y", { value: node.y, stamp: initialStamp });
  nodeRegisters.set("width", { value: node.width, stamp: initialStamp });
  for (const field of ["tabletX", "tabletY", "tabletWidth", "mobileX", "mobileY", "mobileWidth"] as const) {
    if (typeof node[field] === "number") nodeRegisters.set(field, { value: node[field]!, stamp: initialStamp });
  }
  registers.set(node.id, nodeRegisters);
  return nodeRegisters;
}

function writeRegister(node: PageNode, field: string, value: CrdtValue, stamp: CrdtStamp) {
  const nodeRegisters = ensureRegisters(node);
  const current = nodeRegisters.get(field);
  if (current && compareStamps(stamp, current.stamp) <= 0) return false;
  nodeRegisters.set(field, { value, stamp });
  if (field === "label" && typeof value === "string") node.label = value;
  if (field === "content" && typeof value === "string") node.content = value;
  if (field === "lockedBy" && (typeof value === "string" || value === null)) node.lockedBy = value;
  if (field === "x" && typeof value === "number") node.x = value;
  if (field === "y" && typeof value === "number") node.y = value;
  if (field === "width" && typeof value === "number") node.width = value;
  if (["tabletX", "tabletY", "tabletWidth", "mobileX", "mobileY", "mobileWidth"].includes(field) && typeof value === "number") {
    (node as unknown as Record<string, number>)[field] = value;
  }
  return true;
}

function now() {
  return new Date().toISOString().slice(11, 19);
}

function createEvent(
  actor: string,
  action: string,
  target: string,
  detail: string,
  outcome: ActivityEvent["outcome"],
) {
  const event: ActivityEvent = {
    id: `evt-${randomUUID()}`,
    actor,
    action,
    target,
    detail,
    outcome,
    timestamp: now(),
  };
  events.unshift(event);
  events.splice(12);
  return event;
}

function collaboratorFor(client: Client): Collaborator {
  const initials = client.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return {
    id: client.id,
    name: client.name,
    initials: initials || "YU",
    accent: accents[Math.abs(hashCode(client.id)) % accents.length],
    status: "editing",
  };
}

function hashCode(value: string) {
  let hash = 0;
  for (const char of value) hash = (hash << 5) - hash + char.charCodeAt(0);
  return hash;
}

function collaborators() {
  return [...clients.values()].map(collaboratorFor);
}

function snapshot() {
  return {
    type: "snapshot",
    revision,
    nodes: [...nodes.values()].sort((a, b) => a.position - b.position),
    events,
    collaborators: collaborators(),
    chat: chatMessages,
    whiteboard: [...whiteboardItems.values()],
    crdt: {
      algorithm: "Lamport LWW-register CRDT",
      clock: lamportClock,
      operations: seenOperations.size,
    },
  };
}

function frame(message: string) {
  const payload = Buffer.from(message);
  if (payload.length < 126) {
    return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
  }
  if (payload.length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
    return Buffer.concat([header, payload]);
  }
  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(payload.length), 2);
  return Buffer.concat([header, payload]);
}

function send(socket: Socket, value: unknown) {
  if (!socket.destroyed) socket.write(frame(JSON.stringify(value)));
}

function broadcast(value: unknown) {
  for (const client of clients.values()) send(client.socket, value);
}

function applyMessage(client: Client, message: ClientMessage) {
  if (message.type === "cursor" && message.cursor) {
    broadcast({ type: "presence", clientId: client.id, cursor: message.cursor });
    return;
  }

  if (message.type === "join") {
    if (message.userId?.trim()) client.userId = message.userId.trim().slice(0, 128);
    if (message.name?.trim()) client.name = message.name.trim().slice(0, 32);
    send(client.socket, { ...snapshot(), clientId: client.id });
    broadcast({ type: "presence-list", collaborators: collaborators() });
    return;
  }

  if (message.type === "chat") {
    const operation = beginOperation(client, message);
    if (!operation || typeof message.text !== "string") return;
    const text = message.text.trim().slice(0, 1000);
    if (!text) return;
    const chatMessage: ChatMessage = {
      id: `chat-${randomUUID()}`,
      authorId: client.id,
      author: client.name,
      text,
      timestamp: now(),
    };
    chatMessages.push(chatMessage);
    chatMessages.splice(0, Math.max(0, chatMessages.length - 60));
    createEvent(client.name, "messaged", "Realtime chat", "Sent a message to the collaboration room", "applied");
    broadcast({ type: "chat-message", message: chatMessage });
    return;
  }

  if (message.type === "whiteboard-add" && message.whiteboardItem) {
    const operation = beginOperation(client, message);
    if (!operation) return;
    const item = message.whiteboardItem;
    if (!["sticky", "text", "rectangle", "line", "draw"].includes(item.kind)) return;
    const nextItem: WhiteboardItem = {
      ...item,
      id: item.id || `whiteboard-${randomUUID()}`,
      authorId: client.id,
      x: Math.max(0, Math.min(640, Math.round(item.x))),
      y: Math.max(0, Math.min(440, Math.round(item.y))),
      width: typeof item.width === "number" ? Math.max(1, Math.min(640, Math.round(item.width))) : undefined,
      height: typeof item.height === "number" ? Math.max(1, Math.min(440, Math.round(item.height))) : undefined,
      text: typeof item.text === "string" ? item.text.slice(0, 240) : undefined,
      color: typeof item.color === "string" ? item.color.slice(0, 24) : "#e1844c",
      points: item.points?.slice(0, 400).map((point) => ({
        x: Math.max(0, Math.min(640, Math.round(point.x))),
        y: Math.max(0, Math.min(440, Math.round(point.y))),
      })),
    };
    whiteboardItems.set(nextItem.id, nextItem);
    createEvent(client.name, "drew", "Collaboration whiteboard", `Added a ${nextItem.kind} tool mark`, "applied");
    broadcast({ type: "whiteboard-update", items: [...whiteboardItems.values()] });
    return;
  }

  if (message.type === "whiteboard-remove" && typeof message.whiteboardItemId === "string") {
    const operation = beginOperation(client, message);
    if (!operation) return;
    whiteboardItems.delete(message.whiteboardItemId);
    broadcast({ type: "whiteboard-update", items: [...whiteboardItems.values()] });
    return;
  }

  if (message.type === "whiteboard-clear") {
    const operation = beginOperation(client, message);
    if (!operation) return;
    whiteboardItems.clear();
    createEvent(client.name, "cleared", "Collaboration whiteboard", "Removed all shared marks", "applied");
    broadcast({ type: "whiteboard-update", items: [] });
    return;
  }

  if (message.type === "reset") {
    const operation = beginOperation(client, message);
    if (!operation) return;
    nodes.clear();
    for (const node of initialNodes) nodes.set(node.id, { ...node });
    events.splice(0, events.length, ...initialEvents);
    chatMessages.splice(0);
    whiteboardItems.clear();
    registers.clear();
    revision += 1;
    broadcast(snapshot());
    return;
  }

  const node = message.nodeId ? nodes.get(message.nodeId) : undefined;
  if (message.type === "insert" && message.nodeType) {
    const operation = beginOperation(client, message);
    if (!operation) return;
    const defaults: Record<Exclude<NodeType, "PAGE">, { label: string; content: string; width: number }> = {
      HEADING: { label: "New heading", content: "A new point of view.", width: 530 },
      TEXT: { label: "New text block", content: "Write something useful here.", width: 470 },
      BUTTON: { label: "New button", content: "Explore more", width: 180 },
      SECTION: { label: "New section", content: "A fresh region for your story.", width: 530 },
      NAVBAR: { label: "Main navigation", content: "Home · Work · About · Contact", width: 600 },
      HERO: { label: "Hero message", content: "Build something worth sharing.", width: 560 },
      IMAGE: { label: "Featured image", content: "Editorial image placeholder", width: 420 },
      CARD: { label: "Feature cards", content: "Fast setup · Clear hierarchy · Better flow", width: 560 },
      PRICING: { label: "Pricing plans", content: "Starter · Studio · Team", width: 560 },
      TESTIMONIAL: { label: "Customer quote", content: "“This made our launch feel effortless.”", width: 500 },
      LOGIN: { label: "Login form", content: "Welcome back", width: 360 },
      REGISTER: { label: "Registration form", content: "Create your account", width: 360 },
      DASHBOARD: { label: "Dashboard shell", content: "Overview · Activity · Progress", width: 560 },
      CHAT: { label: "Chat panel", content: "Ask us anything", width: 360 },
      FOOTER: { label: "Site footer", content: "WebCraft · Privacy · Terms", width: 600 },
      DIVIDER: { label: "Section divider", content: "", width: 560 },
    };
    const preset = defaults[message.nodeType];
    const next: PageNode = {
      id: `node-${randomUUID()}`,
      type: message.nodeType,
      label: preset.label,
      content: preset.content,
      lockedBy: client.id,
      position: nodes.size,
      lastEditedBy: client.id,
      x: message.x ?? 80,
      y: message.y ?? 520 + nodes.size * 24,
      width: preset.width,
    };
    for (const [field, value] of Object.entries({
      label: next.label,
      content: next.content,
      lockedBy: next.lockedBy,
      x: next.x,
      y: next.y,
      width: next.width,
    })) {
      writeRegister(next, field, value, operation.stamp);
    }
    nodes.set(next.id, next);
    revision += 1;
    createEvent(client.name, "created", next.label, `Inserted ${next.type} into the shared page`, "applied");
    broadcast(snapshot());
    return;
  }

  if (!node) return;

  const ownsLease = !node.lockedBy || node.lockedBy === client.id;
  if ((message.type === "edit" || message.type === "move") && !ownsLease) {
    const lockOwner = [...clients.values()].find((candidate) => candidate.id === node.lockedBy);
    createEvent(
      client.name,
      message.type === "move" ? "moved" : "edited",
      node.label,
      `${lockOwner?.name ?? "Another collaborator"} owns the active lease`,
      "blocked",
    );
    send(client.socket, { type: "blocked", nodeId: node.id, reason: "Another collaborator owns this node lease" });
    broadcast(snapshot());
    return;
  }

  const operation = beginOperation(client, message);
  if (!operation) return;

  if (message.type === "edit" && message.field && typeof message.value === "string") {
    const changed = writeRegister(node, message.field, message.value.slice(0, 1000), operation.stamp);
    if (!changed) return;
    node.lastEditedBy = client.id;
    revision += 1;
    createEvent(client.name, "edited", node.label, `Updated ${message.field} in the shared DOM tree`, "applied");
    broadcast(snapshot());
    return;
  }

  if (message.type === "move" && typeof message.x === "number" && typeof message.y === "number") {
    const nextX = Math.max(20, Math.min(720, Math.round(message.x)));
    const nextY = Math.max(20, Math.min(760, Math.round(message.y)));
    const breakpoint = message.breakpoint ?? "desktop";
    const xField = breakpoint === "tablet" ? "tabletX" : breakpoint === "mobile" ? "mobileX" : "x";
    const yField = breakpoint === "tablet" ? "tabletY" : breakpoint === "mobile" ? "mobileY" : "y";
    const widthField = breakpoint === "tablet" ? "tabletWidth" : breakpoint === "mobile" ? "mobileWidth" : "width";
    const changedX = writeRegister(node, xField, nextX, operation.stamp);
    const changedY = writeRegister(node, yField, nextY, operation.stamp);
    const changedWidth = typeof message.width === "number"
      ? writeRegister(node, widthField, Math.max(120, Math.min(720, Math.round(message.width))), operation.stamp)
      : false;
    if (!changedX && !changedY && !changedWidth) return;
    node.lastEditedBy = client.id;
    revision += 1;
    createEvent(client.name, "moved", node.label, `Position committed at (${node.x}, ${node.y})`, "applied");
    broadcast(snapshot());
    return;
  }

  if (message.type === "lock") {
    if (node.lockedBy && node.lockedBy !== client.id) {
      createEvent(client.name, "requested lock", node.label, "Another writer already holds the lease", "blocked");
      send(client.socket, { type: "blocked", nodeId: node.id, reason: "Another collaborator owns this node lease" });
      broadcast(snapshot());
      return;
    }
    writeRegister(node, "lockedBy", client.id, operation.stamp);
    node.lockedBy = client.id;
    node.lastEditedBy = client.id;
    revision += 1;
    createEvent(client.name, "locked", node.label, "Acquired a shared edit lease", "applied");
    broadcast(snapshot());
    return;
  }

  if (message.type === "unlock" && node.lockedBy === client.id) {
    writeRegister(node, "lockedBy", null, operation.stamp);
    node.lockedBy = null;
    revision += 1;
    createEvent(client.name, "unlocked", node.label, "Released the shared edit lease", "applied");
    broadcast(snapshot());
  }
}

function parseFrames(socket: Socket, incoming: Buffer<ArrayBufferLike>): Buffer<ArrayBufferLike> {
  let buffer = incoming;
  while (buffer.length >= 2) {
    const first = buffer[0];
    const second = buffer[1];
    const masked = Boolean(second & 0x80);
    let offset = 2;
    let length = second & 0x7f;
    if (length === 126) {
      if (buffer.length < 4) return buffer;
      length = buffer.readUInt16BE(2);
      offset = 4;
    } else if (length === 127) {
      if (buffer.length < 10) return buffer;
      length = Number(buffer.readBigUInt64BE(2));
      offset = 10;
    }
    const maskOffset = masked ? 4 : 0;
    if (buffer.length < offset + maskOffset + length) return buffer;
    const mask = masked ? buffer.subarray(offset, offset + 4) : undefined;
    const payloadStart = offset + maskOffset;
    const payload = Buffer.from(buffer.subarray(payloadStart, payloadStart + length));
    if (mask) for (let index = 0; index < payload.length; index += 1) payload[index] ^= mask[index % 4];
    buffer = buffer.subarray(payloadStart + length);

    const opcode = first & 0x0f;
    if (opcode === 0x8) {
      socket.end();
      return buffer;
    }
    if (opcode === 0x9) {
      socket.write(Buffer.from([0x8a, payload.length, ...payload]));
      continue;
    }
    if (opcode === 0x1) {
      try {
        const client = clients.get(socket);
        if (client) applyMessage(client, JSON.parse(payload.toString()) as ClientMessage);
      } catch {
        send(socket, { type: "error", message: "Invalid collaboration message" });
      }
    }
  }
  return buffer;
}

export function attachCollaborationServer(server: Server) {
  server.on("upgrade", (request: IncomingMessage, socket: Socket) => {
    if (!request.url?.startsWith("/api/collab")) {
      socket.destroy();
      return;
    }

    const key = request.headers["sec-websocket-key"];
    if (typeof key !== "string") {
      socket.destroy();
      return;
    }

    const accept = createHash("sha1")
      .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
      .digest("base64");
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );

    const client: Client = {
      id: randomUUID(),
      name: `Builder ${clients.size + 1}`,
      socket,
    };
    clients.set(socket, client);
    let pending: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    socket.on("data", (chunk: Buffer) => {
      pending = parseFrames(socket, Buffer.concat([pending, chunk]));
    });
    socket.on("close", () => {
      clients.delete(socket);
      broadcast({ type: "presence-list", collaborators: collaborators() });
    });
    socket.on("error", () => {
      clients.delete(socket);
    });
    send(socket, { ...snapshot(), clientId: client.id });
    broadcast({ type: "presence-list", collaborators: collaborators() });
    logger.info({ clientId: client.id }, "Collaboration client connected");
  });
}