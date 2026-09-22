import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useUser } from '@clerk/react';
import {
  Activity,
  AlignLeft,
  ArrowUpRight,
  Box,
  Check,
  ChevronDown,
  CircleHelp,
  Clipboard,
  Code2,
  Copy,
  Eye,
  Globe2,
  Heading1,
  Layers3,
  LayoutTemplate,
  Link2,
  Lock,
  LogIn,
  UserPlus,
  LayoutDashboard,
  MessageCircle,
  Navigation,
  Image as ImageIcon,
  CreditCard,
  Grid2X2,
  Footprints,
  Quote,
  Star,
  Ruler,
  Palette,
  Minus,
  MousePointer2,
  PanelRight,
  Pencil,
  RefreshCcw,
  Save,
  Settings2,
  ShieldCheck,
  Send,
  Square,
  StickyNote,
  Trash2,
  Type,
  Unlock,
  Users,
  WandSparkles,
  Wifi,
  WifiOff,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';

type NodeType = 'PAGE' | 'HEADING' | 'TEXT' | 'BUTTON' | 'SECTION' | 'NAVBAR' | 'HERO' | 'IMAGE' | 'CARD' | 'PRICING' | 'TESTIMONIAL' | 'LOGIN' | 'REGISTER' | 'DASHBOARD' | 'CHAT' | 'FOOTER' | 'DIVIDER';
type Breakpoint = 'desktop' | 'tablet' | 'mobile';
type EditableField = 'label' | 'content';
type ConnectionState = 'connecting' | 'live' | 'offline' | 'blocked';

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

type Collaborator = {
  id: string;
  name: string;
  initials: string;
  accent: string;
  status: 'editing' | 'watching' | 'idle' | string;
  cursor?: { x: number; y: number };
};

type ActivityEvent = {
  id: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  outcome: 'applied' | 'blocked' | 'resolved' | 'observed';
  timestamp: string;
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
  kind: 'sticky' | 'text' | 'rectangle' | 'line' | 'draw';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  points?: Array<{ x: number; y: number }>;
  authorId: string;
};

type ThemeSettings = {
  primary: string;
  accent: string;
  surface: string;
  ink: string;
};

const defaultTheme: ThemeSettings = {
  primary: '#214b47',
  accent: '#e1844c',
  surface: '#fffdfa',
  ink: '#274047',
};

type ServerMessage =
  | { type: 'snapshot'; revision: number; nodes: PageNode[]; events: ActivityEvent[]; collaborators: Collaborator[]; chat?: ChatMessage[]; whiteboard?: WhiteboardItem[]; clientId?: string; crdt?: { algorithm: string; clock: number; operations: number } }
  | { type: 'presence-list'; collaborators: Collaborator[] }
  | { type: 'presence'; clientId: string; cursor: { x: number; y: number } }
  | { type: 'chat-message'; message: ChatMessage }
  | { type: 'whiteboard-update'; items: WhiteboardItem[] }
  | { type: 'blocked'; nodeId: string; reason: string };

type ClientMessage =
  | { type: 'join'; name: string }
  | { type: 'edit'; nodeId: string; field: EditableField; value: string }
  | { type: 'move'; nodeId: string; x: number; y: number; width?: number; breakpoint?: Breakpoint }
  | { type: 'insert'; nodeType: Exclude<NodeType, 'PAGE'>; x?: number; y?: number }
  | { type: 'lock'; nodeId: string }
  | { type: 'unlock'; nodeId: string }
  | { type: 'cursor'; cursor: { x: number; y: number } }
  | { type: 'chat'; text: string }
  | { type: 'whiteboard-add'; whiteboardItem: WhiteboardItem }
  | { type: 'whiteboard-remove'; whiteboardItemId: string }
  | { type: 'whiteboard-clear' }
  | { type: 'reset' };

const localId = 'local-you';
const localCollaborator: Collaborator = { id: localId, name: 'You', initials: 'YU', accent: '#177461', status: 'editing' };

const seedNodes: PageNode[] = [
  { id: 'root', type: 'PAGE', label: 'Home page', content: 'Northstar Studio', lockedBy: null, position: 0, lastEditedBy: localId, x: 0, y: 0, width: 660 },
  { id: 'hero', type: 'HEADING', label: 'Hero heading', content: 'Make space for better work.', lockedBy: null, position: 1, lastEditedBy: localId, x: 80, y: 108, width: 530 },
  { id: 'intro', type: 'TEXT', label: 'Intro copy', content: 'A calm workspace for small teams to shape ideas together, without stepping on each other.', lockedBy: null, position: 2, lastEditedBy: localId, x: 82, y: 276, width: 470 },
  { id: 'cta', type: 'BUTTON', label: 'Primary action', content: 'Start a project', lockedBy: null, position: 3, lastEditedBy: localId, x: 82, y: 386, width: 180 },
  { id: 'proof', type: 'SECTION', label: 'Feature section', content: 'Built for momentum, designed for clarity.', lockedBy: null, position: 4, lastEditedBy: localId, x: 80, y: 500, width: 530 },
];

const seedEvents: ActivityEvent[] = [
  { id: 'evt-seed-1', actor: 'System', action: 'opened', target: 'Home page', detail: 'Local editing room is ready', outcome: 'observed', timestamp: 'now' },
];

const blockOptions: Array<{ type: Exclude<NodeType, 'PAGE'>; label: string; detail: string; icon: LucideIcon; tint: string }> = [
  { type: 'HEADING', label: 'Heading', detail: 'A bold title', icon: Heading1, tint: '#177461' },
  { type: 'TEXT', label: 'Text', detail: 'Paragraph copy', icon: AlignLeft, tint: '#587493' },
  { type: 'BUTTON', label: 'Button', detail: 'A clear action', icon: Square, tint: '#cf743f' },
  { type: 'SECTION', label: 'Section', detail: 'A content region', icon: LayoutTemplate, tint: '#8060a3' },
  { type: 'NAVBAR', label: 'Navbar', detail: 'Site navigation', icon: Navigation, tint: '#2a6f97' },
  { type: 'HERO', label: 'Hero', detail: 'Conversion intro', icon: WandSparkles, tint: '#b45f72' },
  { type: 'IMAGE', label: 'Image', detail: 'Visual media', icon: ImageIcon, tint: '#467a62' },
  { type: 'CARD', label: 'Card grid', detail: 'Feature collection', icon: Grid2X2, tint: '#8060a3' },
  { type: 'PRICING', label: 'Pricing', detail: 'Plans and tiers', icon: CreditCard, tint: '#ba6d39' },
  { type: 'TESTIMONIAL', label: 'Testimonial', detail: 'Social proof', icon: Quote, tint: '#a06c4d' },
  { type: 'LOGIN', label: 'Login', detail: 'Member access', icon: LogIn, tint: '#326b8a' },
  { type: 'REGISTER', label: 'Register', detail: 'Create account', icon: UserPlus, tint: '#326b8a' },
  { type: 'DASHBOARD', label: 'Dashboard', detail: 'App overview', icon: LayoutDashboard, tint: '#536e8e' },
  { type: 'CHAT', label: 'Chat', detail: 'Messages and support', icon: MessageCircle, tint: '#177461' },
  { type: 'FOOTER', label: 'Footer', detail: 'Closing navigation', icon: Footprints, tint: '#5b6b72' },
  { type: 'DIVIDER', label: 'Divider', detail: 'Visual rhythm', icon: Minus, tint: '#89999c' },
];

const typeMeta: Record<NodeType, { short: string; color: string; bg: string }> = {
  PAGE: { short: 'PG', color: '#526b78', bg: '#e7eef2' },
  HEADING: { short: 'H1', color: '#177461', bg: '#d9eee8' },
  TEXT: { short: 'TX', color: '#587493', bg: '#e2eaf3' },
  BUTTON: { short: 'BT', color: '#cf743f', bg: '#f8e4d8' },
  SECTION: { short: 'SE', color: '#8060a3', bg: '#ede4f3' },
  NAVBAR: { short: 'NV', color: '#2a6f97', bg: '#e0edf5' },
  HERO: { short: 'HR', color: '#b45f72', bg: '#f5e2e7' },
  IMAGE: { short: 'IM', color: '#467a62', bg: '#e4f0e9' },
  CARD: { short: 'CD', color: '#8060a3', bg: '#ede4f3' },
  PRICING: { short: 'PR', color: '#ba6d39', bg: '#f8e7dc' },
  TESTIMONIAL: { short: 'TS', color: '#a06c4d', bg: '#f3e7df' },
  LOGIN: { short: 'LI', color: '#326b8a', bg: '#e2eef4' },
  REGISTER: { short: 'RG', color: '#326b8a', bg: '#e2eef4' },
  DASHBOARD: { short: 'DB', color: '#536e8e', bg: '#e5ebf3' },
  CHAT: { short: 'CH', color: '#177461', bg: '#d9eee8' },
  FOOTER: { short: 'FT', color: '#5b6b72', bg: '#e8edef' },
  DIVIDER: { short: '—', color: '#89999c', bg: '#edf1f2' },
};

const defaults: Record<Exclude<NodeType, 'PAGE'>, { label: string; content: string; width: number }> = {
  HEADING: { label: 'New heading', content: 'A new point of view.', width: 530 },
  TEXT: { label: 'New text block', content: 'Write something useful here.', width: 470 },
  BUTTON: { label: 'New button', content: 'Explore more', width: 180 },
  SECTION: { label: 'New section', content: 'A fresh region for your story.', width: 530 },
  NAVBAR: { label: 'Main navigation', content: 'Home · Work · About · Contact', width: 600 },
  HERO: { label: 'Hero message', content: 'Build something worth sharing.', width: 560 },
  IMAGE: { label: 'Featured image', content: 'Editorial image placeholder', width: 420 },
  CARD: { label: 'Feature cards', content: 'Fast setup · Clear hierarchy · Better flow', width: 560 },
  PRICING: { label: 'Pricing plans', content: 'Starter · Studio · Team', width: 560 },
  TESTIMONIAL: { label: 'Customer quote', content: '“This made our launch feel effortless.”', width: 500 },
  LOGIN: { label: 'Login form', content: 'Welcome back', width: 360 },
  REGISTER: { label: 'Registration form', content: 'Create your account', width: 360 },
  DASHBOARD: { label: 'Dashboard shell', content: 'Overview · Activity · Progress', width: 560 },
  CHAT: { label: 'Chat panel', content: 'Ask us anything', width: 360 },
  FOOTER: { label: 'Site footer', content: 'Northstar · Privacy · Terms', width: 600 },
  DIVIDER: { label: 'Section divider', content: '', width: 560 },
};

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function withGeometry(node: PageNode, index: number): PageNode {
  return { ...node, x: typeof node.x === 'number' ? node.x : 80, y: typeof node.y === 'number' ? node.y : 90 + index * 120, width: typeof node.width === 'number' ? node.width : 500 };
}

function getNodeGeometry(node: PageNode, breakpoint: Breakpoint, index = 0, canvasWidth = 660) {
  if (breakpoint === 'desktop') return { x: node.x, y: node.y, width: node.width };
  if (breakpoint === 'tablet') {
    return {
      x: node.tabletX ?? Math.max(24, Math.min(canvasWidth - 24 - Math.min(node.width, canvasWidth - 48), node.x * 0.82)),
      y: node.tabletY ?? node.y,
      width: node.tabletWidth ?? Math.min(node.width, canvasWidth - 48),
    };
  }
  return {
    x: node.mobileX ?? 20,
    y: node.mobileY ?? 90 + index * 124,
    width: node.mobileWidth ?? canvasWidth - 40,
  };
}

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'YU';
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function generateDocument(nodes: PageNode[], theme: ThemeSettings = defaultTheme) {
  const page = nodes.find((node) => node.type === 'PAGE') ?? seedNodes[0];
  const authoredNodes = nodes.filter((node) => node.type !== 'PAGE');
  const blocks = authoredNodes.map((node, index) => {
    const geometry = getNodeGeometry(node, 'desktop', index);
    const style = `left:${Math.round(geometry.x)}px;top:${Math.round(geometry.y)}px;width:${Math.round(geometry.width)}px`;
    const id = escapeHtml(node.id);
    const content = escapeHtml(node.content);
    if (node.type === 'HEADING') return `    <h1 data-node-id="${id}" class="node node-heading" style="${style}">${content}</h1>`;
    if (node.type === 'TEXT') return `    <p data-node-id="${id}" class="node node-text" style="${style}">${content}</p>`;
    if (node.type === 'BUTTON') return `    <button data-node-id="${id}" class="node node-button" style="${style}" type="button">${content}</button>`;
    if (node.type === 'NAVBAR') return `    <nav data-node-id="${id}" class="node node-navbar" style="${style}"><strong>northstar</strong><span>${content}</span></nav>`;
    if (node.type === 'HERO') return `    <section data-node-id="${id}" class="node node-hero" style="${style}"><span class="section-kicker">A considered beginning</span><h1>${content}</h1><button class="node-button">Start exploring</button></section>`;
    if (node.type === 'IMAGE') return `    <figure data-node-id="${id}" class="node node-image" style="${style}"><div class="image-placeholder"><span>${content}</span></div><figcaption>Designed for the way your story moves.</figcaption></figure>`;
    if (node.type === 'CARD') return `    <section data-node-id="${id}" class="node node-card" style="${style}"><span class="section-kicker">Why it works</span><div class="card-grid">${content.split('·').map((item) => `<article><strong>${escapeHtml(item.trim())}</strong><p>Clear, useful, and ready for your audience.</p></article>`).join('')}</div></section>`;
    if (node.type === 'PRICING') return `    <section data-node-id="${id}" class="node node-pricing" style="${style}"><span class="section-kicker">Choose your pace</span><div class="pricing-grid">${content.split('·').map((item, itemIndex) => `<article class="${itemIndex === 1 ? 'featured' : ''}"><strong>${escapeHtml(item.trim())}</strong><b>${itemIndex === 0 ? '$12' : itemIndex === 1 ? '$28' : '$64'}</b><p>Everything you need to move forward.</p></article>`).join('')}</div></section>`;
    if (node.type === 'TESTIMONIAL') return `    <blockquote data-node-id="${id}" class="node node-testimonial" style="${style}"><div class="stars">★★★★★</div><p>${content}</p><cite>— A thoughtful customer</cite></blockquote>`;
    if (node.type === 'LOGIN') return `    <form data-node-id="${id}" class="node node-auth" style="${style}"><span class="section-kicker">Member access</span><h3>${content}</h3><input type="email" placeholder="Email address" /><input type="password" placeholder="Password" /><button class="node-button" type="button">Log in</button><small>Forgot password?</small></form>`;
    if (node.type === 'REGISTER') return `    <form data-node-id="${id}" class="node node-auth" style="${style}"><span class="section-kicker">Join the community</span><h3>${content}</h3><input type="text" placeholder="Full name" /><input type="email" placeholder="Email address" /><button class="node-button" type="button">Create account</button><small>Already have an account? Log in</small></form>`;
    if (node.type === 'DASHBOARD') return `    <section data-node-id="${id}" class="node node-dashboard" style="${style}"><span class="section-kicker">Workspace overview</span><h3>${content}</h3><div class="dashboard-grid"><article><small>Active projects</small><b>08</b></article><article><small>Tasks completed</small><b>72%</b></article><article><small>Team activity</small><b>24</b></article></div></section>`;
    if (node.type === 'CHAT') return `    <section data-node-id="${id}" class="node node-chat" style="${style}"><div class="chat-head"><span class="status-dot"></span>${content}</div><div class="chat-message">Hi there. How can we help?</div><div class="chat-input">Write a message… <button type="button">Send</button></div></section>`;
    if (node.type === 'FOOTER') return `    <footer data-node-id="${id}" class="node node-footer" style="${style}"><strong>northstar</strong><span>${content}</span></footer>`;
    if (node.type === 'DIVIDER') return `    <hr data-node-id="${id}" class="node node-divider" style="${style}" />`;
    return `    <section data-node-id="${id}" class="node node-section" style="${style}"><span class="section-kicker">A considered section</span><p>${content}</p></section>`;
  }).join('\n');
  const responsiveRules = authoredNodes.map((node, index) => {
    const tablet = getNodeGeometry(node, 'tablet', index, 768);
    const mobile = getNodeGeometry(node, 'mobile', index, 390);
    const selector = `.page-frame [data-node-id="${escapeHtml(node.id)}"]`;
    return `@media (max-width: 900px) { ${selector} { left:${Math.round(tablet.x)}px; top:${Math.round(tablet.y)}px; width:${Math.round(tablet.width)}px; } }\n@media (max-width: 600px) { ${selector} { left:${Math.round(mobile.x)}px; top:${Math.round(mobile.y)}px; width:${Math.round(mobile.width)}px; } }`;
  }).join('\n');
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(page.content)}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main data-node-id="${escapeHtml(page.id)}" class="page-frame">
      <header class="site-header"><strong>northstar</strong><nav><a href="#about">About</a><a href="#work">Work</a><a href="#contact">Contact</a></nav></header>
${blocks}
      <footer class="site-footer">Made together, one visible decision at a time.</footer>
    </main>
    <script src="script.js"></script>
  </body>
</html>`;
  const css = `:root {
  --brand: ${theme.primary};
  --accent: ${theme.accent};
  --surface: ${theme.surface};
  --ink: ${theme.ink};
  color: var(--ink);
  background: #f7f3ec;
  font-family: "Space Grotesk", system-ui, sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; background: #f7f3ec; }
.page-frame { position: relative; width: 660px; min-height: 900px; margin: 40px auto; overflow: hidden; background: #fffdfa; box-shadow: 0 12px 35px rgba(44,62,68,.1); }
.site-header { display: flex; justify-content: space-between; align-items: center; height: 78px; padding: 0 36px; border-bottom: 1px solid #ece8df; color: #1e6157; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; }
.site-header nav { display: flex; gap: 20px; color: #879390; font-size: 10px; letter-spacing: 0; text-transform: none; }
.site-header a { color: inherit; text-decoration: none; }
.node { position: absolute; margin: 0; }
.node-heading { color: #274047; font-size: 62px; line-height: .93; letter-spacing: -.08em; }
.node-text { color: #71817d; font-size: 14px; line-height: 1.7; }
  .node-button { border: 0; border-radius: 8px; padding: 12px 16px; background: var(--brand); color: #effaf6; font-weight: 700; text-align: left; }
.node-section { border: 1px solid #e8e0d6; border-radius: 8px; padding: 20px; background: #f7f2e9; }
.node-section p { margin: 12px 0 0; color: #455b5b; font-size: 18px; font-weight: 600; }
.section-kicker { color: #b58362; font: 9px "DM Mono", monospace; letter-spacing: .16em; text-transform: uppercase; }
.site-footer { position: absolute; right: 0; bottom: 0; left: 0; padding: 16px 36px; border-top: 1px solid #ece8df; color: #a0aaa4; font-size: 9px; letter-spacing: .16em; text-transform: uppercase; }
.node-navbar,.node-footer { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:18px 24px; border-bottom:1px solid #ece8df; color:#1e6157; text-transform:uppercase; letter-spacing:.1em; font-size:11px; }
.node-navbar span,.node-footer span { color:#879390; font-size:10px; letter-spacing:0; text-transform:none; }
.node-hero { padding:26px; border-radius:12px; background:linear-gradient(135deg,#eff8f4,#f7f2e9); }
  .node-hero h1 { max-width:480px; margin:10px 0 22px; color:var(--ink); font-size:48px; line-height:.98; letter-spacing:-.07em; }
.node-image .image-placeholder { display:grid; min-height:170px; place-items:center; border-radius:12px; background:linear-gradient(135deg,#d9eee8,#e9e0f2 52%,#f4d9ca); color:#355a58; font-size:12px; }
.node-image figcaption { padding-top:8px; color:#879390; font-size:10px; }
.node-card,.node-pricing,.node-dashboard { padding:22px; border:1px solid #e8e0d6; border-radius:12px; background:#fffdfa; }
.card-grid,.pricing-grid,.dashboard-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:16px; }
.card-grid article,.pricing-grid article,.dashboard-grid article { padding:14px; border:1px solid #e8e0d6; border-radius:9px; background:#f7f2e9; }
.card-grid p,.pricing-grid p { margin:8px 0 0; color:#71817d; font-size:11px; line-height:1.5; }
  .pricing-grid b,.dashboard-grid b { display:block; margin-top:10px; color:var(--brand); font-size:24px; }
.pricing-grid .featured { border-color:#74ad9e; box-shadow:0 6px 16px rgba(33,75,71,.12); }
.node-testimonial { padding:24px; border-left:4px solid #e1844c; background:#f7f2e9; }
.node-testimonial p { margin:10px 0; color:#455b5b; font-size:20px; line-height:1.35; }
  .stars { color:var(--accent); letter-spacing:.15em; }
.node-auth { display:grid; gap:10px; padding:22px; border:1px solid #d7e1e3; border-radius:12px; background:#f8fafb; }
.node-auth h3 { margin:0 0 4px; color:#274047; font-size:24px; letter-spacing:-.05em; }
.node-auth input,.chat-input { width:100%; border:1px solid #d5e0e2; border-radius:7px; padding:10px 12px; background:#fff; color:#455b5b; }
.node-auth small { color:#879390; font-size:10px; }
.node-chat { padding:14px; border:1px solid #d7e1e3; border-radius:12px; background:#fff; }
.chat-head { display:flex; align-items:center; gap:8px; padding-bottom:12px; border-bottom:1px solid #ece8df; color:#274047; font-weight:700; }
.status-dot { width:7px; height:7px; border-radius:50%; background:#2e9a7e; }
.chat-message { margin:14px 0; max-width:230px; padding:10px; border-radius:9px 9px 9px 2px; background:#edf7f4; color:#52656b; font-size:11px; }
.chat-input { display:flex; justify-content:space-between; color:#9aa7aa; font-size:10px; }
.chat-input button { border:0; background:none; color:#177461; font-weight:700; }
.node-divider { border:0; border-top:1px solid #d7e1e3; }
${responsiveRules}`;
  const js = `const nodes = document.querySelectorAll("[data-node-id]");
nodes.forEach((node) => {
  node.addEventListener("click", () => {
    console.log("Selected node:", node.dataset.nodeId);
  });
});
console.log("Northstar page booted with", nodes.length, "nodes");`;
  return { html, css, js };
}

function renderCanvasNode(node: PageNode) {
  const parts = node.content.split('·').map((part) => part.trim()).filter(Boolean);
  if (node.type === 'HEADING') return <h3 className="pointer-events-none max-w-[510px] text-[clamp(32px,5vw,62px)] font-bold leading-[.93] tracking-[-.08em] text-[#274047]">{node.content}</h3>;
  if (node.type === 'TEXT') return <p className="pointer-events-none max-w-[500px] text-[14px] leading-6 text-[#71817d]">{node.content}</p>;
  if (node.type === 'BUTTON') return <span className="pointer-events-none inline-flex items-center gap-2 rounded-lg bg-[#214b47] px-4 py-3 text-[12px] font-bold text-[#effaf6]">{node.content}<ArrowUpRight size={14} /></span>;
  if (node.type === 'SECTION') return <div className="pointer-events-none rounded-lg border border-[#e8e0d6] bg-[#f7f2e9] p-5"><div className="mb-3 flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[.16em] text-[#b58362]">A considered section</span><Box size={15} className="text-[#c89572]" /></div><p className="text-[18px] font-semibold tracking-[-.03em] text-[#455b5b]">{node.content}</p></div>;
  if (node.type === 'NAVBAR') return <div className="pointer-events-none flex items-center justify-between gap-4 rounded-lg border border-[#dce7e4] bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#1e6157]"><span>northstar</span><span className="font-normal normal-case tracking-normal text-[#879390]">{node.content}</span></div>;
  if (node.type === 'HERO') return <div className="pointer-events-none rounded-xl bg-gradient-to-br from-[#eff8f4] to-[#f7f2e9] p-6"><span className="font-mono text-[9px] uppercase tracking-[.16em] text-[#b58362]">A considered beginning</span><h3 className="mt-2 max-w-[470px] text-[34px] font-bold leading-none tracking-[-.07em] text-[#274047]">{node.content}</h3><span className="mt-4 inline-flex rounded-lg bg-[#214b47] px-3 py-2 text-[10px] font-bold text-white">Start exploring</span></div>;
  if (node.type === 'IMAGE') return <div className="pointer-events-none"><div className="grid min-h-[130px] place-items-center rounded-xl bg-gradient-to-br from-[#d9eee8] via-[#e9e0f2] to-[#f4d9ca] text-[11px] text-[#355a58]">{node.content}</div><p className="mt-2 text-[9px] text-[#879390]">Designed for the way your story moves.</p></div>;
  if (node.type === 'CARD') return <div className="pointer-events-none rounded-xl border border-[#e8e0d6] bg-white p-4"><span className="font-mono text-[9px] uppercase tracking-[.16em] text-[#b58362]">Why it works</span><div className="mt-3 grid grid-cols-3 gap-2">{parts.map((part) => <div key={part} className="rounded-lg bg-[#f7f2e9] p-3 text-[10px] font-bold text-[#52656b]">{part}<p className="mt-2 text-[9px] font-normal leading-3 text-[#879390]">Clear and ready for your audience.</p></div>)}</div></div>;
  if (node.type === 'PRICING') return <div className="pointer-events-none rounded-xl border border-[#e8e0d6] bg-white p-4"><span className="font-mono text-[9px] uppercase tracking-[.16em] text-[#b58362]">Choose your pace</span><div className="mt-3 grid grid-cols-3 gap-2">{parts.map((part, index) => <div key={part} className={`rounded-lg border p-3 ${index === 1 ? 'border-[#74ad9e] bg-[#edf7f4]' : 'border-[#e8e0d6] bg-[#f7f2e9]'}`}><strong className="text-[10px] text-[#52656b]">{part}</strong><b className="mt-2 block text-[18px] text-[#214b47]">{index === 0 ? '$12' : index === 1 ? '$28' : '$64'}</b></div>)}</div></div>;
  if (node.type === 'TESTIMONIAL') return <blockquote className="pointer-events-none border-l-4 border-[#e1844c] bg-[#f7f2e9] p-4"><div className="text-[11px] tracking-[.15em] text-[#e1844c]">★★★★★</div><p className="mt-2 text-[16px] leading-5 text-[#455b5b]">{node.content}</p><cite className="mt-2 block text-[9px] text-[#879390]">— A thoughtful customer</cite></blockquote>;
  if (node.type === 'LOGIN' || node.type === 'REGISTER') return <div className="pointer-events-none grid gap-2 rounded-xl border border-[#d7e1e3] bg-[#f8fafb] p-4"><span className="font-mono text-[9px] uppercase tracking-[.16em] text-[#b58362]">{node.type === 'LOGIN' ? 'Member access' : 'Join the community'}</span><h3 className="text-[20px] font-bold tracking-[-.05em] text-[#274047]">{node.content}</h3><div className="rounded-md border border-[#d5e0e2] bg-white px-3 py-2 text-[9px] text-[#9aa7aa]">Email address</div><div className="rounded-md border border-[#d5e0e2] bg-white px-3 py-2 text-[9px] text-[#9aa7aa]">Password</div><span className="rounded-md bg-[#214b47] px-3 py-2 text-center text-[10px] font-bold text-white">{node.type === 'LOGIN' ? 'Log in' : 'Create account'}</span></div>;
  if (node.type === 'DASHBOARD') return <div className="pointer-events-none rounded-xl border border-[#e8e0d6] bg-white p-4"><span className="font-mono text-[9px] uppercase tracking-[.16em] text-[#b58362]">Workspace overview</span><h3 className="mt-2 text-[18px] font-bold text-[#274047]">{node.content}</h3><div className="mt-3 grid grid-cols-3 gap-2">{['08 active', '72% complete', '24 updates'].map((metric) => <div key={metric} className="rounded-lg bg-[#f7f2e9] p-2 text-[9px] text-[#52656b]">{metric}</div>)}</div></div>;
  if (node.type === 'CHAT') return <div className="pointer-events-none rounded-xl border border-[#d7e1e3] bg-white p-3"><div className="flex items-center gap-2 border-b border-[#ece8df] pb-2 text-[10px] font-bold text-[#274047]"><span className="h-2 w-2 rounded-full bg-[#2e9a7e]" />{node.content}</div><div className="my-3 max-w-[210px] rounded-lg bg-[#edf7f4] p-2 text-[9px] text-[#52656b]">Hi there. How can we help?</div><div className="rounded-md border border-[#d5e0e2] px-2 py-2 text-[9px] text-[#9aa7aa]">Write a message…</div></div>;
  if (node.type === 'FOOTER') return <div className="pointer-events-none flex items-center justify-between gap-4 border-t border-[#ece8df] px-3 py-4 text-[10px] uppercase tracking-[.1em] text-[#1e6157]"><strong>northstar</strong><span className="normal-case tracking-normal text-[#879390]">{node.content}</span></div>;
  if (node.type === 'DIVIDER') return <hr className="pointer-events-none border-0 border-t border-[#d7e1e3]" />;
  return null;
}

function Editor() {
  const [nodes, setNodes] = useState<PageNode[]>(seedNodes);
  const [events, setEvents] = useState<ActivityEvent[]>(seedEvents);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([localCollaborator]);
  const [selectedId, setSelectedId] = useState('hero');
  const [clientId, setClientId] = useState(localId);
  const [revision, setRevision] = useState(0);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [blockedNotice, setBlockedNotice] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStatus, setSimStatus] = useState('Ready to simulate');
  const [activeTab, setActiveTab] = useState<'design' | 'layers' | 'activity' | 'collab' | 'code'>('design');
  const [codeTab, setCodeTab] = useState<'html' | 'css' | 'js'>('html');
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [activeBreakpoint, setActiveBreakpoint] = useState<Breakpoint>('desktop');
  const [showGuides, setShowGuides] = useState(true);
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const [isPreview, setIsPreview] = useState(false);
  const [published, setPublished] = useState(false);
  const [saveState, setSaveState] = useState('Connecting to shared canvas');
  const [crdtStatus, setCrdtStatus] = useState({ algorithm: 'Lamport LWW-register CRDT', clock: 0, operations: 0 });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [whiteboardItems, setWhiteboardItems] = useState<WhiteboardItem[]>([]);
  const [whiteboardTool, setWhiteboardTool] = useState<WhiteboardItem['kind'] | 'select'>('sticky');
  const [whiteboardColor, setWhiteboardColor] = useState('#e1844c');
  const [whiteboardText, setWhiteboardText] = useState('');
  const [whiteboardDraftPoints, setWhiteboardDraftPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const { user } = useUser();
  const socketRef = useRef<WebSocket | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; pointerId: number; breakpoint: Breakpoint; canvasWidth: number; startX: number; startY: number; nodeX: number; nodeY: number; lastX: number; lastY: number; lastSentAt: number } | null>(null);
  const dragNodeElements = useRef(new Map<string, HTMLDivElement>());
  const cursorTimer = useRef<number | null>(null);
  const whiteboardRef = useRef<HTMLDivElement | null>(null);
  const whiteboardDragRef = useRef<{ pointerId: number; start: { x: number; y: number }; points: Array<{ x: number; y: number }> } | null>(null);
  const operationClock = useRef(0);
  const operationSession = useRef(`tab-${Math.random().toString(36).slice(2)}`);

  const signedInId = user?.id ?? localId;
  const signedInName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'You';
  const localProfile: Collaborator = {
    id: signedInId,
    name: signedInName,
    initials: initials(signedInName),
    accent: '#177461',
    status: 'editing',
  };
  const actorId = clientId || signedInId;
  const actor = collaborators.find((person) => person.id === actorId) ?? localProfile;
  const selectedNode = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  const selectedIndex = Math.max(0, nodes.findIndex((node) => node.id === selectedId));
  const canvasWidth = activeBreakpoint === 'desktop' ? 660 : activeBreakpoint === 'tablet' ? 600 : 390;
  const selectedGeometry = selectedNode ? getNodeGeometry(selectedNode, activeBreakpoint, selectedIndex, canvasWidth) : { x: 20, y: 84, width: canvasWidth - 40 };
  const canEdit = Boolean(selectedNode) && (!selectedNode.lockedBy || selectedNode.lockedBy === actorId);
  const activeLocks = nodes.filter((node) => node.lockedBy);
  const recentlyResolved = events.some((event) => event.outcome === 'resolved');
  const visibleEvents = useMemo(() => events.slice(0, 10), [events]);
  const generated = useMemo(() => generateDocument(nodes, theme), [nodes, theme]);
  const codeValue = generated[codeTab];

  const addEvent = useCallback((event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    setEvents((current) => [{ ...event, id: `local-${Date.now()}-${current.length}`, timestamp: formatTime() }, ...current].slice(0, 12));
  }, []);

  const sendMessage = useCallback((message: ClientMessage, options?: { quiet?: boolean }) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      const isEphemeral = message.type === 'join' || message.type === 'cursor';
      const nextMessage = isEphemeral
        ? message
        : {
            ...message,
            opId: `${signedInId}:${operationSession.current}:${operationClock.current + 1}`,
            clock: ++operationClock.current,
          };
      socket.send(JSON.stringify(nextMessage));
      if (!options?.quiet) setSaveState('Sending shared change');
      return true;
    }
    setConnection('offline');
    setSaveState('Offline · local changes only');
    return false;
  }, [signedInId]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${window.location.host}/api/collab`);
    socketRef.current = socket;
    setConnection('connecting');
    setSaveState('Connecting to shared canvas');
    socket.onopen = () => {
      setConnection('live');
      setSaveState('Shared canvas connected');
       socket.send(JSON.stringify({ type: 'join', name: signedInName, userId: signedInId }));
    };
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.type === 'snapshot') {
          const nextNodes = message.nodes.map(withGeometry);
          setNodes(nextNodes.length ? nextNodes : seedNodes);
          setEvents(message.events.length ? message.events : seedEvents);
          setCollaborators(message.collaborators.length ? message.collaborators : [localCollaborator]);
           setChatMessages(message.chat ?? []);
           setWhiteboardItems(message.whiteboard ?? []);
          setRevision(message.revision);
           if (message.crdt) setCrdtStatus(message.crdt);
          if (message.clientId) setClientId(message.clientId);
          setConnection('live');
          setSaveState(`Revision ${message.revision} · all changes shared`);
          return;
        }
        if (message.type === 'presence-list') {
          setCollaborators((current) => message.collaborators.map((person) => ({ ...person, cursor: current.find((item) => item.id === person.id)?.cursor })));
          return;
        }
        if (message.type === 'presence') {
          setCollaborators((current) => current.map((person) => person.id === message.clientId ? { ...person, cursor: message.cursor, status: 'editing' } : person));
          return;
        }
         if (message.type === 'chat-message') {
           setChatMessages((current) => [...current.filter((item) => item.id !== message.message.id), message.message].slice(-60));
           return;
         }
         if (message.type === 'whiteboard-update') {
           setWhiteboardItems(message.items);
           return;
         }
        if (message.type === 'blocked') {
          setBlockedNotice(message.reason);
          setConnection('blocked');
          setSelectedId(message.nodeId);
          const target = nodes.find((node) => node.id === message.nodeId);
          addEvent({ actor: 'Protocol', action: 'blocked', target: target?.label ?? message.nodeId, detail: message.reason, outcome: 'blocked' });
          window.setTimeout(() => setConnection(socket.readyState === WebSocket.OPEN ? 'live' : 'offline'), 2400);
        }
      } catch {
        setSaveState('Received an unreadable shared message');
      }
    };
    socket.onerror = () => {
      setConnection('offline');
      setSaveState('Offline · local changes only');
    };
    socket.onclose = () => {
      socketRef.current = null;
      setConnection('offline');
      setSaveState('Offline · local changes only');
    };
    return () => {
      socket.close();
      socketRef.current = null;
      if (cursorTimer.current) window.clearTimeout(cursorTimer.current);
    };
  }, [addEvent, signedInId, signedInName]);

  const selectNode = (node: PageNode) => {
    setSelectedId(node.id);
    setBlockedNotice('');
    addEvent({ actor: actor.name, action: 'selected', target: node.label, detail: 'Inspector is now observing this node', outcome: 'observed' });
  };

  const updateNode = (field: EditableField, value: string) => {
    if (!selectedNode || !canEdit) {
      setBlockedNotice('This node is leased by another collaborator.');
      return;
    }
    setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, [field]: value, lastEditedBy: actorId } : node));
    sendMessage({ type: 'edit', nodeId: selectedId, field, value });
    setSaveState(connection === 'live' ? 'Sending edit…' : 'Offline · local edit retained');
  };

  const commitEdit = (field: string) => {
    if (selectedNode && canEdit) addEvent({ actor: actor.name, action: 'edited', target: selectedNode.label, detail: `Committed ${field} change to the shared DOM tree`, outcome: 'applied' });
  };

  const toggleLock = (node: PageNode) => {
    if (node.lockedBy && node.lockedBy !== actorId) {
      setBlockedNotice(`${collaborators.find((person) => person.id === node.lockedBy)?.name ?? 'Another collaborator'} owns this node lease.`);
      setConnection('blocked');
      addEvent({ actor: actor.name, action: 'requested lock', target: node.label, detail: 'Another writer already holds the lease', outcome: 'blocked' });
      sendMessage({ type: 'lock', nodeId: node.id });
      return;
    }
    const acquiring = !node.lockedBy;
    setNodes((current) => current.map((item) => item.id === node.id ? { ...item, lockedBy: acquiring ? actorId : null } : item));
    sendMessage({ type: acquiring ? 'lock' : 'unlock', nodeId: node.id });
    addEvent({ actor: actor.name, action: acquiring ? 'locked' : 'unlocked', target: node.label, detail: acquiring ? 'Acquired a shared edit lease' : 'Released the shared edit lease', outcome: 'applied' });
  };

  const addNode = (type: Exclude<NodeType, 'PAGE'>) => {
    const preset = defaults[type];
    const x = 80;
    const y = Math.min(790, 570 + Math.max(0, nodes.length - 5) * 96);
    if (sendMessage({ type: 'insert', nodeType: type, x, y })) {
      setSaveState('Insert sent to shared canvas');
    } else {
      const nextNode: PageNode = { id: `local-node-${Date.now()}`, type, label: preset.label, content: preset.content, lockedBy: actorId, position: nodes.length, lastEditedBy: actorId, x, y, width: preset.width };
      setNodes((current) => [...current, nextNode]);
      setSelectedId(nextNode.id);
      addEvent({ actor: actor.name, action: 'created', target: nextNode.label, detail: `Inserted ${type} in local mode`, outcome: 'applied' });
    }
    setActiveTab('design');
  };

  const runSimulation = () => {
    if (isSimulating || !selectedNode) return;
    const target = selectedNode;
    setIsSimulating(true);
    setSimStatus('Two writes are in flight…');
    sendMessage({ type: 'lock', nodeId: target.id });
    addEvent({ actor: 'Simulation', action: 'started', target: target.label, detail: 'Two writers entered the same edit window', outcome: 'observed' });
    window.setTimeout(() => {
      setSimStatus('Conflict detected');
      addEvent({ actor: 'Remote writer', action: 'edited', target: target.label, detail: 'Proposed write was rejected by the active lease', outcome: 'blocked' });
    }, 650);
    window.setTimeout(() => {
      setSimStatus('Resolving with lease priority…');
      addEvent({ actor: 'Protocol', action: 'resolved', target: target.label, detail: 'Active lease retained; event stream remains deterministic', outcome: 'resolved' });
      setNodes((current) => current.map((node) => node.id === target.id ? { ...node, lockedBy: actorId, lastEditedBy: actorId } : node));
    }, 1250);
    window.setTimeout(() => {
      setIsSimulating(false);
      setSimStatus('Resolved deterministically');
    }, 1900);
  };

  const resetEditor = () => {
    if (sendMessage({ type: 'reset' })) {
      setSaveState('Reset sent to shared canvas');
    } else {
      setNodes(seedNodes);
      setEvents(seedEvents);
      setSelectedId('hero');
      addEvent({ actor: actor.name, action: 'reset', target: 'Home page', detail: 'Restored the local collaboration sandbox', outcome: 'applied' });
    }
    setSimStatus('Ready to simulate');
    setIsSimulating(false);
    setIsPreview(false);
    setPublished(false);
  };

  const publishPage = () => {
    setPublished(true);
    addEvent({ actor: actor.name, action: 'published', target: 'Home page', detail: 'Created a local preview snapshot', outcome: 'applied' });
  };

  const handleNodePointerDown = (event: PointerEvent<HTMLDivElement>, node: PageNode) => {
    if (isPreview) return;
    selectNode(node);
    if (node.lockedBy && node.lockedBy !== actorId) {
      setBlockedNotice(`${collaborators.find((person) => person.id === node.lockedBy)?.name ?? 'Another collaborator'} owns this node lease.`);
      setConnection('blocked');
      return;
    }
    if (!node.lockedBy) {
      setNodes((current) => current.map((item) => item.id === node.id ? { ...item, lockedBy: actorId } : item));
      sendMessage({ type: 'lock', nodeId: node.id });
    }
    dragRef.current = {
      id: node.id,
      pointerId: event.pointerId,
      breakpoint: activeBreakpoint,
      canvasWidth,
      startX: event.clientX,
      startY: event.clientY,
      nodeX: getNodeGeometry(node, activeBreakpoint, nodes.indexOf(node), canvasWidth).x,
      nodeY: getNodeGeometry(node, activeBreakpoint, nodes.indexOf(node), canvasWidth).y,
      lastX: getNodeGeometry(node, activeBreakpoint, nodes.indexOf(node), canvasWidth).x,
      lastY: getNodeGeometry(node, activeBreakpoint, nodes.indexOf(node), canvasWidth).y,
      lastSentAt: 0,
    };
    setDraggingId(node.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleNodePointerMove = (event: PointerEvent<HTMLDivElement>, node: PageNode) => {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || !frame || drag.id !== node.id || drag.pointerId !== event.pointerId) return;
    const rect = frame.getBoundingClientRect();
    const scale = rect.width / drag.canvasWidth;
    const x = Math.max(20, Math.min(drag.canvasWidth - 40, Math.round(drag.nodeX + (event.clientX - drag.startX) / scale)));
    const y = Math.max(84, Math.min(810, Math.round(drag.nodeY + (event.clientY - drag.startY) / scale)));
    drag.lastX = x;
    drag.lastY = y;
    const element = dragNodeElements.current.get(node.id);
    if (element) {
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
    }
    const now = performance.now();
    if (now - drag.lastSentAt >= 50) {
      drag.lastSentAt = now;
      sendMessage({ type: 'move', nodeId: node.id, x, y, width: getNodeGeometry(node, drag.breakpoint, nodes.indexOf(node), drag.canvasWidth).width, breakpoint: drag.breakpoint }, { quiet: true });
    }
  };

  const handleNodePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) {
      const node = nodes.find((item) => item.id === drag.id);
      if (node) {
        const geometry = getNodeGeometry(node, drag.breakpoint, nodes.indexOf(node), drag.canvasWidth);
        const nextFields = drag.breakpoint === 'tablet'
          ? { tabletX: drag.lastX, tabletY: drag.lastY, tabletWidth: geometry.width }
          : drag.breakpoint === 'mobile'
            ? { mobileX: drag.lastX, mobileY: drag.lastY, mobileWidth: geometry.width }
            : { x: drag.lastX, y: drag.lastY, width: geometry.width };
        setNodes((current) => current.map((item) => item.id === drag.id ? { ...item, ...nextFields, lastEditedBy: actorId } : item));
        sendMessage({ type: 'move', nodeId: drag.id, x: drag.lastX, y: drag.lastY, width: geometry.width, breakpoint: drag.breakpoint }, { quiet: true });
      }
      dragRef.current = null;
      setDraggingId(null);
      setSaveState(connection === 'live' ? 'Position shared' : 'Offline · local changes only');
    }
  };

  const handleCanvasPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const frame = frameRef.current;
    if (!frame || cursorTimer.current) return;
    const rect = frame.getBoundingClientRect();
    const scale = rect.width / canvasWidth;
    const cursor = { x: Math.round((event.clientX - rect.left) / scale), y: Math.round((event.clientY - rect.top) / scale) };
    cursorTimer.current = window.setTimeout(() => {
      cursorTimer.current = null;
      sendMessage({ type: 'cursor', cursor }, { quiet: true });
    }, 45);
  };

  const sendChatMessage = () => {
    const text = chatDraft.trim().slice(0, 1000);
    if (!text) return;
    const didSend = sendMessage({ type: 'chat', text });
    if (!didSend) {
      setChatMessages((current) => [...current, {
        id: `local-chat-${Date.now()}`,
        authorId: actorId,
        author: actor.name,
        text,
        timestamp: formatTime(),
      }].slice(-60));
    }
    setChatDraft('');
  };

  const whiteboardPoint = (event: PointerEvent<HTMLDivElement>) => {
    const surface = whiteboardRef.current;
    if (!surface) return { x: 0, y: 0 };
    const rect = surface.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(640, Math.round(((event.clientX - rect.left) / rect.width) * 640))),
      y: Math.max(0, Math.min(440, Math.round(((event.clientY - rect.top) / rect.height) * 440))),
    };
  };

  const publishWhiteboardItem = (item: Omit<WhiteboardItem, 'id' | 'authorId'>) => {
    const nextItem: WhiteboardItem = { ...item, id: `whiteboard-${actorId}-${Date.now()}`, authorId: actorId };
    setWhiteboardItems((current) => [...current.filter((entry) => entry.id !== nextItem.id), nextItem]);
    sendMessage({ type: 'whiteboard-add', whiteboardItem: nextItem });
  };

  const handleWhiteboardPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (whiteboardTool === 'select') return;
    const point = whiteboardPoint(event);
    if (whiteboardTool === 'sticky' || whiteboardTool === 'text') {
      publishWhiteboardItem({
        kind: whiteboardTool,
        x: point.x,
        y: point.y,
        width: whiteboardTool === 'sticky' ? 148 : 190,
        height: whiteboardTool === 'sticky' ? 92 : 38,
        text: whiteboardText.trim() || (whiteboardTool === 'sticky' ? 'New idea' : 'Add a note'),
        color: whiteboardColor,
      });
      setWhiteboardText('');
      setWhiteboardTool('select');
      return;
    }
    whiteboardDragRef.current = { pointerId: event.pointerId, start: point, points: [point] };
    setWhiteboardDraftPoints([point]);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleWhiteboardPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const draft = whiteboardDragRef.current;
    if (!draft || draft.pointerId !== event.pointerId) return;
    const point = whiteboardPoint(event);
    const points = whiteboardTool === 'draw' ? [...draft.points, point] : [draft.start, point];
    draft.points = points;
    setWhiteboardDraftPoints(points);
  };

  const handleWhiteboardPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const draft = whiteboardDragRef.current;
    if (!draft || draft.pointerId !== event.pointerId) return;
    const end = draft.points[draft.points.length - 1] ?? draft.start;
    if (whiteboardTool === 'rectangle') {
      publishWhiteboardItem({
        kind: 'rectangle',
        x: Math.min(draft.start.x, end.x),
        y: Math.min(draft.start.y, end.y),
        width: Math.max(12, Math.abs(end.x - draft.start.x)),
        height: Math.max(12, Math.abs(end.y - draft.start.y)),
        color: whiteboardColor,
      });
    } else if (whiteboardTool === 'line') {
      publishWhiteboardItem({
        kind: 'line',
        x: draft.start.x,
        y: draft.start.y,
        width: end.x - draft.start.x,
        height: end.y - draft.start.y,
        color: whiteboardColor,
      });
    } else if (whiteboardTool === 'draw' && draft.points.length > 1) {
      publishWhiteboardItem({ kind: 'draw', x: 0, y: 0, width: 640, height: 440, points: draft.points, color: whiteboardColor });
    }
    whiteboardDragRef.current = null;
    setWhiteboardDraftPoints([]);
  };

  const clearWhiteboard = () => {
    setWhiteboardItems([]);
    sendMessage({ type: 'whiteboard-clear' });
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const connectionLabel = connection === 'live' ? 'LIVE SHARED' : connection === 'connecting' ? 'CONNECTING' : connection === 'blocked' ? 'WRITE BLOCKED' : 'OFFLINE LOCAL';
  const connectionColor = connection === 'live' ? '#2e9a7e' : connection === 'blocked' ? '#cf743f' : '#9b7a5c';

  return (
    <main className="min-h-[100dvh] bg-[#e7edf2] font-sans text-[#202b32]">
      <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-[#cdd8de] bg-[#fbfcfc] px-4 py-3 shadow-[0_1px_0_rgba(40,57,67,.04)] md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#173e3b] text-[#c6eee5] shadow-[0_5px_12px_rgba(23,62,59,.2)]"><WandSparkles size={18} strokeWidth={1.8} /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-2"><h1 className="truncate text-[15px] font-bold tracking-[-.03em] text-[#1f3034]">Northstar Studio</h1><span className="hidden rounded-full bg-[#e4f2ee] px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[.12em] text-[#177461] sm:inline">Shared workspace</span></div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#73818a]"><Globe2 size={11} /> Home page <ChevronDown size={12} /></div>
          </div>
        </div>
        <div className="order-3 flex w-full items-center justify-between gap-2 sm:order-none sm:w-auto">
          <div className="hidden items-center gap-2 rounded-full border border-[#d9e1e4] bg-[#f5f8f8] px-3 py-1.5 md:flex"><span className="h-1.5 w-1.5 rounded-full" style={{ background: connectionColor }} /><span data-testid="status-save" className="font-mono text-[10px] text-[#657780]">{saveState}</span></div>
          <div data-testid="status-connection" className="flex items-center gap-1.5 rounded-full border border-[#d9e1e4] bg-[#f5f8f8] px-2.5 py-1.5 font-mono text-[9px] font-medium tracking-[.08em]" style={{ color: connectionColor }}>{connection === 'offline' ? <WifiOff size={11} /> : <Wifi size={11} />}{connectionLabel}</div>
          <button data-testid="button-preview" onClick={() => { setIsPreview((value) => !value); addEvent({ actor: actor.name, action: isPreview ? 'closed preview' : 'opened preview', target: 'Home page', detail: 'Switched canvas presentation mode', outcome: 'observed' }); }} className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-[11px] font-semibold transition hover:-translate-y-0.5 ${isPreview ? 'border-[#177461] bg-[#e3f3ef] text-[#177461]' : 'border-[#d3dde1] bg-white text-[#52646c] hover:border-[#177461]/50'}`}><Eye size={14} /> {isPreview ? 'Back to edit' : 'Preview'}</button>
          <button data-testid="button-publish" onClick={publishPage} className="flex h-9 items-center gap-2 rounded-lg bg-[#e1844c] px-3.5 text-[11px] font-bold text-[#2b1d18] transition hover:-translate-y-0.5 hover:bg-[#ee9661]"><ArrowUpRight size={14} /> {published ? 'Published' : 'Publish'}</button>
          <button data-testid="button-reset-editor" onClick={resetEditor} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d3dde1] bg-white text-[#71828a] transition hover:border-[#cf743f]/50 hover:text-[#cf743f]" aria-label="Reset editor"><RefreshCcw size={14} /></button>
        </div>
      </header>

      <div className="grid min-h-[calc(100dvh-72px)] grid-cols-1 xl:grid-cols-[238px_minmax(520px,1fr)_344px]">
        <aside className="builder-scrollbar border-b border-[#cdd8de] bg-[#f8fafb] p-4 lg:border-r lg:border-b-0">
          <div className="mb-5 flex items-center justify-between"><div><p className="font-mono text-[10px] font-medium uppercase tracking-[.18em] text-[#6f8089]">Insert</p><h2 className="mt-1 text-[15px] font-bold tracking-[-.03em] text-[#26373c]">Build your page</h2></div><button data-testid="button-help" className="flex h-7 w-7 items-center justify-center rounded-full text-[#8b9aa1] transition hover:bg-[#e8eff1] hover:text-[#177461]" aria-label="Builder help"><CircleHelp size={15} /></button></div>
          <div className="mb-6 grid grid-cols-2 gap-2">{blockOptions.map((block) => { const Icon = block.icon; return <button key={block.type} data-testid={`button-add-${block.type.toLowerCase()}`} onClick={() => addNode(block.type)} className="group rounded-xl border border-[#dce4e7] bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-[#accbc3] hover:shadow-[0_8px_18px_rgba(43,70,74,.09)]"><span className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${block.tint}16`, color: block.tint }}><Icon size={16} strokeWidth={1.8} /></span><span className="block text-[12px] font-bold text-[#33454b]">{block.label}</span><span className="mt-1 block text-[10px] leading-4 text-[#87959b]">{block.detail}</span></button>; })}</div>
          <div className="mb-4 flex items-center justify-between border-t border-[#dde5e7] pt-4"><div className="flex items-center gap-2"><Layers3 size={14} className="text-[#177461]" /><span className="font-mono text-[10px] font-medium uppercase tracking-[.16em] text-[#71818a]">Layers</span></div><span data-testid="text-node-count" className="rounded-full bg-[#e4ecef] px-2 py-0.5 font-mono text-[10px] text-[#70818a]">{nodes.length}</span></div>
          <div className="space-y-1.5">{nodes.map((node) => { const owner = collaborators.find((person) => person.id === node.lockedBy); const isSelected = node.id === selectedId; const meta = typeMeta[node.type]; return <button key={node.id} data-testid={`node-${node.id}`} onClick={() => selectNode(node)} className={`group flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition ${isSelected ? 'border-[#9bcabd] bg-[#e5f3ef] shadow-[inset_3px_0_0_#177461]' : 'border-transparent hover:border-[#d9e3e6] hover:bg-white'}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[9px] font-bold" style={{ color: meta.color, backgroundColor: meta.bg }}>{meta.short}</span><span className="min-w-0 flex-1"><span className={`block truncate text-[11px] font-semibold ${isSelected ? 'text-[#177461]' : 'text-[#405159]'}`}>{node.label}</span><span className="mt-0.5 block truncate font-mono text-[9px] text-[#95a2a7]">/{node.type.toLowerCase()}</span></span>{owner && <Lock size={12} style={{ color: owner.accent }} />}</button>; })}</div>
           <div className="mt-6 rounded-xl border border-[#d7e5e1] bg-[#edf7f4] p-3.5"><div className="mb-2 flex items-center gap-2 text-[#177461]"><ShieldCheck size={14} /><span className="text-[11px] font-bold">Conflict-aware canvas</span></div><p className="text-[10px] leading-4 text-[#648079]">Every node has a visible lease. Edits never disappear silently.</p></div>
           <div className="mt-3 rounded-xl border border-[#d7e1e3] bg-white p-3.5"><div className="mb-3 flex items-center gap-2"><Palette size={14} className="text-[#b66438]" /><span className="text-[11px] font-bold text-[#43565c]">Theme direction</span></div><p className="mb-3 text-[10px] leading-4 text-[#87969b]">Tune the authored export without touching the editor chrome.</p><div className="grid grid-cols-2 gap-2">{([['primary', 'Primary'], ['accent', 'Accent'], ['surface', 'Surface'], ['ink', 'Ink']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-lg border border-[#e1e7e8] bg-[#f8fafb] px-2 py-2"><input aria-label={`Theme ${label}`} type="color" value={theme[key]} onChange={(event) => setTheme((current) => ({ ...current, [key]: event.target.value }))} className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0" /><span className="font-mono text-[9px] uppercase tracking-wider text-[#71828a]">{label}</span></label>)}</div><button onClick={() => setTheme(defaultTheme)} className="mt-2 w-full rounded-lg border border-[#d8e1e3] px-2 py-2 font-mono text-[9px] uppercase tracking-wider text-[#849399] hover:border-[#9bcabd] hover:text-[#177461]">Reset theme</button></div>
        </aside>

        <section className="grid-surface min-w-0 border-b border-[#cdd8de] p-4 md:p-6 lg:border-r lg:border-b-0">
          <div className="mx-auto flex w-full max-w-[860px] flex-col">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-[#819099]"><span className="text-[#177461]">Canvas</span><span className="text-[#a9b4b8]">/</span><span>Home page</span></div><h2 className="text-[26px] font-bold tracking-[-.06em] text-[#24363a] md:text-[32px]">Shape the story.</h2><p className="mt-1 text-[12px] text-[#73838a]">{isPreview ? 'Previewing the live page.' : 'Drag any block to reposition it in the shared page frame.'}</p></div><div className="flex items-center gap-2 rounded-xl border border-[#d4dee1] bg-[#f8faf9] p-1">{collaborators.slice(0, 4).map((person, index) => <div key={`${person.id}-${index}`} data-testid={`presence-${person.id}-${index}`} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-[#33484e]" title={`${person.name} · ${person.status}`}><span className="flex h-5 w-5 items-center justify-center rounded-full font-mono text-[8px] font-bold" style={{ backgroundColor: `${person.accent}19`, color: person.accent }}>{person.initials || initials(person.name)}</span>{person.id === actorId ? 'You' : person.name.split(' ')[0]}</div>)}</div></div>
            {blockedNotice && <div data-testid="status-blocked" className="blocked-banner mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#e7c5a8] bg-[#fff3e8] px-3.5 py-3 text-[11px] text-[#805235]"><span className="flex items-center gap-2"><Lock size={13} />{blockedNotice}</span><button data-testid="button-dismiss-blocked" onClick={() => setBlockedNotice('')} className="rounded p-1 text-[#b96a39] hover:bg-[#f8dfca]" aria-label="Dismiss blocked write"><X size={13} /></button></div>}
            <div className="soft-shadow overflow-hidden rounded-2xl border border-[#c6d3d7] bg-[#fbfcfb]">
               <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce3e3] bg-[#f8faf9] px-4 py-3"><div className="flex items-center gap-2.5"><div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-[#e1844c]" /><span className="h-2 w-2 rounded-full bg-[#e9be61]" /><span className="h-2 w-2 rounded-full bg-[#61a892]" /></div><span className="ml-1 font-mono text-[10px] text-[#819096]">northstar.local / {isPreview ? 'preview' : 'shared canvas'}</span></div><div className="flex items-center gap-3"><div className="flex items-center gap-1.5 font-mono text-[9px]" style={{ color: connectionColor }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: connectionColor }} /> {connectionLabel}</div><div className="flex items-center gap-1 rounded-md border border-[#d6e0e1] bg-white px-1.5 py-1"><button data-testid="button-zoom-out" onClick={() => setZoom((value) => Math.max(80, value - 10))} className="px-1 text-[#708087] hover:text-[#177461]" aria-label="Zoom out">−</button><span data-testid="status-zoom" className="min-w-[32px] text-center font-mono text-[9px] text-[#6d7b81]">{zoom}%</span><button data-testid="button-zoom-in" onClick={() => setZoom((value) => Math.min(120, value + 10))} className="px-1 text-[#708087] hover:text-[#177461]" aria-label="Zoom in">+</button></div></div></div>
               <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce3e3] bg-[#f8faf9] px-4 py-2"><div className="flex items-center gap-2"><Ruler size={12} className="text-[#177461]" /><span className="font-mono text-[9px] uppercase tracking-[.14em] text-[#819096]">Viewport</span>{(['desktop', 'tablet', 'mobile'] as const).map((breakpoint) => <button key={breakpoint} data-testid={`button-breakpoint-${breakpoint}`} onClick={() => setActiveBreakpoint(breakpoint)} className={`rounded-md px-2 py-1 font-mono text-[9px] uppercase tracking-wider ${activeBreakpoint === breakpoint ? 'bg-[#dff0eb] text-[#177461]' : 'text-[#87969c] hover:bg-white'}`}>{breakpoint}</button>)}</div><button data-testid="button-toggle-guides" onClick={() => setShowGuides((value) => !value)} className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[9px] ${showGuides ? 'bg-[#e9f3f1] text-[#177461]' : 'text-[#87969c]'}`}><Ruler size={11} /> {showGuides ? 'Guides on' : 'Guides off'}</button></div>
              <div className={`canvas-grid builder-scrollbar min-h-[520px] overflow-auto p-5 transition-opacity sm:p-10 ${isPreview ? 'cursor-default' : ''}`}>
                 <div className="mx-auto" style={{ width: canvasWidth * (zoom / 100), minHeight: 900 * (zoom / 100) }}>
                   <div ref={frameRef} className="page-frame" onPointerMove={handleCanvasPointerMove} style={{ width: canvasWidth, transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
                    <div className="absolute left-0 right-0 top-0 flex h-[78px] items-center justify-between border-b border-[#ece8df] px-6 sm:px-9"><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#1e6157]"><span className="h-2 w-2 rounded-full bg-[#e1844c]" /> northstar</div><div className="hidden items-center gap-5 text-[10px] text-[#879390] sm:flex"><span>About</span><span>Work</span><span>Contact</span></div><button data-testid="button-canvas-menu" className="rounded-md border border-[#dfe5df] px-2 py-1 text-[10px] text-[#71817e] sm:hidden" aria-label="Open page menu"><PanelRight size={12} /></button></div>
                     {nodes.filter((node) => node.type !== 'PAGE').map((node) => { const isSelected = node.id === selectedId; const owner = collaborators.find((person) => person.id === node.lockedBy); const lastEditor = collaborators.find((person) => person.id === node.lastEditedBy); const geometry = getNodeGeometry(node, activeBreakpoint, nodes.indexOf(node), canvasWidth); return <div key={node.id} ref={(element) => { if (element) dragNodeElements.current.set(node.id, element); else dragNodeElements.current.delete(node.id); }} data-testid={`canvas-node-${node.id}`} role="button" tabIndex={0} onClick={() => !isPreview && selectNode(node)} onKeyDown={(event) => { if (event.key === 'Enter') selectNode(node); }} onPointerDown={(event) => handleNodePointerDown(event, node)} onPointerMove={(event) => handleNodePointerMove(event, node)} onPointerUp={handleNodePointerUp} onPointerCancel={handleNodePointerUp} className={`page-node group absolute rounded-xl border-2 p-4 outline-none ${isSelected && !isPreview ? 'selection-ring border-[#258b79] bg-[#f0faf6]' : 'border-transparent hover:border-[#cbded8] hover:bg-[#fbfdf9]'} ${draggingId === node.id ? 'is-dragging' : ''}`} style={{ left: geometry.x, top: geometry.y, width: geometry.width, minHeight: node.type === 'HEADING' ? 100 : undefined }}>{renderCanvasNode(node)}<div className="pointer-events-none absolute -top-3 left-3 z-10 hidden items-center gap-1.5 rounded-md bg-[#177461] px-2 py-1 font-mono text-[9px] font-medium text-white shadow-sm group-hover:flex"><MousePointer2 size={10} /> {node.label}<span className="ml-1 opacity-70">· {node.type.toLowerCase()}</span></div>{!isPreview && owner && <div className="pointer-events-none absolute -right-2 -top-3 z-10 flex items-center gap-1.5 rounded-full border border-white bg-white px-2 py-1 font-mono text-[9px] shadow-sm" style={{ color: owner.accent }}><Lock size={10} /> {owner.id === actorId ? 'your lease' : owner.name}</div>}{isSelected && !isPreview && <div className="pointer-events-none mt-3 flex items-center gap-2 border-t border-[#d6e9e3] pt-2 font-mono text-[9px] text-[#78928c]"><span className="flex items-center gap-1 text-[#177461]"><Save size={10} /> selected</span><span>·</span><span>{lastEditor?.name ?? 'Local writer'} last edited</span></div>}</div>; })}
                     {showGuides && !isPreview && selectedNode && <><div className="pointer-events-none absolute border-l border-dashed border-[#54a794]" style={{ left: selectedGeometry.x, top: 78, bottom: 52 }} /><div className="pointer-events-none absolute border-t border-dashed border-[#54a794]" style={{ left: 20, top: selectedGeometry.y, width: selectedGeometry.width }} /><div className="pointer-events-none absolute z-20 rounded bg-[#e3f3ee] px-1.5 py-1 font-mono text-[8px] text-[#177461]" style={{ left: selectedGeometry.x + 5, top: Math.max(80, selectedGeometry.y - 18) }}>{Math.round(selectedGeometry.x)} × {Math.round(selectedGeometry.y)} · {Math.round(selectedGeometry.width)}w</div></>}
                    {collaborators.filter((person) => person.id !== actorId && person.cursor).map((person, index) => <div key={`cursor-${person.id}-${index}`} className="presence-cursor" style={{ left: person.cursor?.x, top: person.cursor?.y, color: person.accent }}><MousePointer2 size={16} fill="currentColor" /><span className="ml-2 rounded-full px-1.5 py-1 font-mono text-[8px] text-white" style={{ background: person.accent }}>{person.name}</span></div>)}
                    <div className="absolute bottom-0 left-0 right-0 border-t border-[#ece8df] px-6 py-4 text-[9px] uppercase tracking-[.16em] text-[#a0aaa4] sm:px-9">Made together, one visible decision at a time.</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[#dce3e3] bg-[#f8faf9] px-4 py-2.5"><span data-testid="status-render" className="font-mono text-[9px] text-[#809097]">rendered locally · {nodes.length} DOM nodes · revision {revision || 'local'}</span><span className="flex items-center gap-1.5 font-mono text-[9px]" style={{ color: connectionColor }}>{connection === 'blocked' ? <Lock size={11} /> : <Check size={11} />} {connection === 'live' ? 'synced' : connection === 'blocked' ? 'write blocked' : 'local mode'}</span></div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><div className="flex items-center gap-3 rounded-xl border border-[#d5e0e2] bg-[#f8faf9] p-3.5"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e3f2ee] text-[#177461]"><Settings2 size={15} /></div><div className="min-w-0"><p className="text-[11px] font-bold text-[#43565c]">Editing {selectedNode.label}</p><p className="mt-0.5 truncate text-[10px] text-[#849196]">{canEdit ? 'Drag or write while the lease is available.' : `${collaborators.find((person) => person.id === selectedNode.lockedBy)?.name ?? 'Another collaborator'} currently owns this node.`}</p></div><span data-testid="status-selected-lease" className={`ml-auto shrink-0 rounded-full px-2 py-1 font-mono text-[9px] ${canEdit ? 'bg-[#e0f1ec] text-[#177461]' : 'bg-[#f8e7d9] text-[#b66438]'}`}>{canEdit ? 'editable' : 'read only'}</span></div><button data-testid="button-run-simulation" onClick={runSimulation} disabled={isSimulating} className={`group flex min-h-[70px] min-w-[178px] items-center justify-between gap-5 rounded-xl border px-4 py-3 text-left transition ${isSimulating ? 'border-[#d6a26d] bg-[#fff1e6]' : recentlyResolved ? 'border-[#9bcabd] bg-[#e9f7f2] hover:border-[#177461]' : 'border-[#bedbd3] bg-[#eff9f5] hover:-translate-y-0.5 hover:border-[#177461]'}`}><span className="flex items-center gap-2.5"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${isSimulating ? 'bg-[#f8dfca] text-[#c8753c]' : 'bg-[#d9eee8] text-[#177461]'}`}><Zap size={15} /></span><span><span className="block text-[11px] font-bold text-[#38535a]">{isSimulating ? 'Running protocol' : 'Race two edits'}</span><span className="mt-0.5 block font-mono text-[9px] text-[#849397]">{isSimulating ? simStatus : 'See resolution in action'}</span></span></span><ArrowUpRight size={14} className="text-[#5c7a77] transition group-hover:translate-x-0.5" /></button></div>
          </div>
        </section>

        <aside className="builder-scrollbar max-h-[none] overflow-y-auto bg-[#f8fafb] p-4 md:p-5 xl:max-h-[calc(100dvh-72px)]">
          <div className="mb-5 flex items-center justify-between"><div><p className="font-mono text-[10px] font-medium uppercase tracking-[.18em] text-[#70818a]">Workspace panel</p><h2 className="mt-1 text-[15px] font-bold tracking-[-.03em] text-[#26373c]">Inspector</h2></div><button data-testid="button-panel-settings" className="flex h-7 w-7 items-center justify-center rounded-md text-[#87969c] transition hover:bg-[#e8eff1] hover:text-[#177461]" aria-label="Inspector settings"><Settings2 size={14} /></button></div>
          <div className="mb-5 grid grid-cols-5 rounded-lg border border-[#d7e0e3] bg-[#eef3f4] p-1">{([['design', 'Design', Settings2], ['layers', 'Layers', Layers3], ['activity', 'Activity', Activity], ['collab', 'Live', MessageCircle], ['code', 'Code', Code2]] as const).map(([tab, label, Icon]) => <button key={tab} data-testid={`button-tab-${tab}`} onClick={() => setActiveTab(tab)} className={`flex items-center justify-center gap-1 rounded-md py-2 text-[10px] font-bold transition ${activeTab === tab ? 'bg-white text-[#177461] shadow-sm' : 'text-[#819097] hover:text-[#496169]'}`}><Icon size={12} />{label}</button>)}</div>

          {activeTab === 'design' && <div className="space-y-4"><div className="rounded-xl border border-[#d7e1e3] bg-white p-4"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ color: typeMeta[selectedNode.type].color, backgroundColor: typeMeta[selectedNode.type].bg }}><Type size={14} /></span><div><p data-testid="text-selected-node" className="text-[12px] font-bold text-[#34484e]">{selectedNode.label}</p><p className="font-mono text-[9px] uppercase tracking-[.12em] text-[#91a0a5]">{selectedNode.type} node</p></div></div><span className={`flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[9px] ${selectedNode.lockedBy ? 'bg-[#f8e8da] text-[#b8653a]' : 'bg-[#e4f2ed] text-[#237a67]'}`}>{selectedNode.lockedBy ? <Lock size={10} /> : <Unlock size={10} />}{selectedNode.lockedBy ? 'leased' : 'open'}</span></div><label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[.14em] text-[#849399]" htmlFor="node-label">Layer name</label><input id="node-label" data-testid="input-node-label" value={selectedNode.label} onChange={(event) => updateNode('label', event.target.value)} onBlur={() => commitEdit('layer name')} disabled={!canEdit} className="w-full rounded-lg border border-[#d8e1e3] bg-[#f8fafb] px-3 py-2.5 text-[12px] font-semibold text-[#3d5157] outline-none transition placeholder:text-[#a5afb2] focus:border-[#65a998] disabled:cursor-not-allowed disabled:opacity-50" /><label className="mb-1.5 mt-4 block font-mono text-[9px] uppercase tracking-[.14em] text-[#849399]" htmlFor="node-content">Content</label><textarea id="node-content" data-testid="input-node-content" value={selectedNode.content} onChange={(event) => updateNode('content', event.target.value)} onBlur={() => commitEdit('content')} disabled={!canEdit} rows={4} className="w-full resize-none rounded-lg border border-[#d8e1e3] bg-[#f8fafb] px-3 py-2.5 text-[12px] leading-5 text-[#52656b] outline-none transition focus:border-[#65a998] disabled:cursor-not-allowed disabled:opacity-50" /><button data-testid="button-toggle-lock" onClick={() => toggleLock(selectedNode)} className={`mt-3 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-[11px] font-bold transition ${selectedNode.lockedBy === actorId ? 'border-[#9bcabd] bg-[#e3f3ee] text-[#177461]' : selectedNode.lockedBy ? 'border-[#e8c6a9] bg-[#fff2e7] text-[#b66438]' : 'border-[#d6e0e2] bg-[#f6f9f9] text-[#62767c] hover:border-[#91c5b7] hover:text-[#177461]'}`}><span className="flex items-center gap-2">{selectedNode.lockedBy ? <Lock size={13} /> : <Unlock size={13} />}{selectedNode.lockedBy === actorId ? 'Release your lease' : selectedNode.lockedBy ? `Leased by ${collaborators.find((person) => person.id === selectedNode.lockedBy)?.name ?? 'another writer'}` : 'Acquire edit lease'}</span><ArrowUpRight size={12} /></button><div className="mt-3 flex items-center justify-between font-mono text-[9px] text-[#8c9b9f]"><span>{canEdit ? 'writes allowed' : 'writes blocked by protocol'}</span><span>edited by {collaborators.find((person) => person.id === selectedNode.lastEditedBy)?.name ?? 'local writer'}</span></div></div><div className="rounded-xl border border-[#d7e1e3] bg-[#f2f7f6] p-4"><div className="mb-2 flex items-center gap-2 text-[#177461]"><Lock size={13} /><span className="text-[11px] font-bold">Lease protocol</span></div><p className="text-[10px] leading-4 text-[#70847f]">The active writer keeps the lease. A competing write is recorded, then deferred by the server.</p><div className="mt-3 flex items-center justify-between border-t border-[#dbe8e4] pt-3 font-mono text-[9px] text-[#7d918c]"><span>{activeLocks.length} active leases</span><span>revision {revision || 'local'}</span></div></div></div>}
            {activeTab === 'collab' && <div className="space-y-4">
              <div className="rounded-xl border border-[#d7e1e3] bg-white p-4">
                <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><MessageCircle size={14} className="text-[#177461]" /><span className="text-[11px] font-bold text-[#41555b]">Realtime chat</span></div><span className="rounded-full bg-[#e4f2ed] px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-[#237a67]">{chatMessages.length} messages</span></div>
                <div data-testid="chat-messages" className="mb-3 max-h-56 space-y-2 overflow-y-auto rounded-lg bg-[#f7faf9] p-2">
                  {chatMessages.length === 0 && <p className="px-2 py-5 text-center text-[10px] text-[#94a2a6]">Start a conversation with the room.</p>}
                  {chatMessages.map((message) => <div key={message.id} className={`rounded-lg px-2.5 py-2 ${message.authorId === actorId ? 'ml-5 bg-[#e3f3ee]' : 'mr-5 bg-white shadow-[0_1px_3px_rgba(50,70,75,.06)]'}`}><div className="flex items-center justify-between gap-2"><span className="text-[9px] font-bold text-[#52656b]">{message.authorId === actorId ? 'You' : message.author}</span><time className="font-mono text-[8px] text-[#9aa7aa]">{message.timestamp}</time></div><p className="mt-1 whitespace-pre-wrap break-words text-[10px] leading-4 text-[#65777c]">{message.text}</p></div>)}
                </div>
                <form onSubmit={(event) => { event.preventDefault(); sendChatMessage(); }} className="flex gap-2">
                  <input data-testid="input-chat" value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} maxLength={1000} placeholder="Message the room…" className="min-w-0 flex-1 rounded-lg border border-[#d8e1e3] bg-[#f8fafb] px-3 py-2.5 text-[11px] text-[#52656b] outline-none focus:border-[#65a998]" />
                  <button data-testid="button-send-chat" type="submit" disabled={!chatDraft.trim()} className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#214b47] text-[#effaf6] transition hover:bg-[#177461] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send chat message"><Send size={13} /></button>
                </form>
              </div>
              <div className="rounded-xl border border-[#d7e1e3] bg-white p-4">
                <div className="mb-3 flex items-center justify-between"><div><div className="flex items-center gap-2"><Pencil size={14} className="text-[#8060a3]" /><span className="text-[11px] font-bold text-[#41555b]">Shared whiteboard</span></div><p className="mt-1 text-[10px] text-[#8a999e]">Choose a tool, then draw or place a mark.</p></div><button data-testid="button-clear-whiteboard" onClick={clearWhiteboard} className="flex items-center gap-1 rounded-lg border border-[#e3d6d0] px-2 py-1.5 font-mono text-[9px] text-[#a06c4d] hover:bg-[#fff5ef]"><Trash2 size={11} /> Clear</button></div>
                <div className="mb-3 grid grid-cols-3 gap-1.5">
                  {([['select', 'Select'], ['sticky', 'Sticky'], ['text', 'Text'], ['rectangle', 'Box'], ['line', 'Line'], ['draw', 'Freehand']] as const).map(([tool, label]) => <button key={tool} data-testid={`button-whiteboard-${tool}`} onClick={() => setWhiteboardTool(tool)} className={`rounded-lg border px-2 py-2 text-[9px] font-bold transition ${whiteboardTool === tool ? 'border-[#9bcabd] bg-[#e5f3ef] text-[#177461]' : 'border-[#d9e2e4] bg-[#f9fbfb] text-[#75868b] hover:border-[#b7d4ce]'}`}>{label}</button>)}
                </div>
                <div className="mb-3 flex gap-2">
                  <input aria-label="Whiteboard note text" value={whiteboardText} onChange={(event) => setWhiteboardText(event.target.value)} placeholder="Note text for sticky/text" className="min-w-0 flex-1 rounded-lg border border-[#d8e1e3] bg-[#f8fafb] px-2.5 py-2 text-[10px] text-[#52656b] outline-none focus:border-[#65a998]" />
                  <input aria-label="Whiteboard color" type="color" value={whiteboardColor} onChange={(event) => setWhiteboardColor(event.target.value)} className="h-9 w-10 cursor-pointer rounded-lg border border-[#d8e1e3] bg-white p-1" />
                </div>
                <div ref={whiteboardRef} data-testid="whiteboard-surface" onPointerDown={handleWhiteboardPointerDown} onPointerMove={handleWhiteboardPointerMove} onPointerUp={handleWhiteboardPointerUp} onPointerCancel={handleWhiteboardPointerUp} className={`relative aspect-[8/5] overflow-hidden rounded-xl border border-dashed border-[#bed1d0] bg-[#f7faf8] ${whiteboardTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}>
                  <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(#dce8e5 1px, transparent 1px), linear-gradient(90deg, #dce8e5 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                  {whiteboardItems.map((item) => <div key={item.id} onDoubleClick={() => { setWhiteboardItems((current) => current.filter((entry) => entry.id !== item.id)); sendMessage({ type: 'whiteboard-remove', whiteboardItemId: item.id }); }} className="absolute" style={{ left: `${(item.x / 640) * 100}%`, top: `${(item.y / 440) * 100}%`, width: item.width ? `${(Math.abs(item.width) / 640) * 100}%` : undefined, height: item.height ? `${(Math.abs(item.height) / 440) * 100}%` : undefined }}>
                    {item.kind === 'sticky' && <div className="h-full w-full rounded-lg p-2.5 text-[10px] font-semibold leading-4 text-[#533c2e] shadow-[0_5px_12px_rgba(100,75,55,.13)]" style={{ backgroundColor: `${item.color ?? '#e1844c'}aa` }}>{item.text}</div>}
                    {item.kind === 'text' && <div className="h-full w-full rounded-md border border-[#b9cbc8] bg-white/90 px-2.5 py-2 text-[10px] font-semibold text-[#52656b]">{item.text}</div>}
                    {item.kind === 'rectangle' && <div className="h-full w-full rounded-md border-2" style={{ borderColor: item.color ?? '#e1844c' }} />}
                    {item.kind === 'line' && <svg className="pointer-events-none absolute left-0 top-0 h-full w-full overflow-visible"><line x1={item.width && item.width < 0 ? `${Math.abs(item.width)}` : 0} y1={item.height && item.height < 0 ? `${Math.abs(item.height)}` : 0} x2={item.width && item.width > 0 ? item.width : 0} y2={item.height && item.height > 0 ? item.height : 0} stroke={item.color ?? '#e1844c'} strokeWidth="3" /></svg>}
                    {item.kind === 'draw' && <svg className="pointer-events-none absolute -left-0.5 -top-0.5 h-[calc(100%+4px)] w-[calc(100%+4px)] overflow-visible"><polyline points={(item.points ?? []).map((point) => `${point.x - item.x},${point.y - item.y}`).join(' ')} fill="none" stroke={item.color ?? '#e1844c'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg>}
                  </div>)}
                  {whiteboardDraftPoints.length > 1 && whiteboardTool === 'draw' && <svg className="pointer-events-none absolute inset-0 h-full w-full"><polyline points={whiteboardDraftPoints.map((point) => `${(point.x / 640) * 100}%,${(point.y / 440) * 100}%`).join(' ')} fill="none" stroke={whiteboardColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg>}
                  {whiteboardItems.length === 0 && whiteboardDraftPoints.length === 0 && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-[#95a5a6]">Your shared ideas will appear here</div>}
                </div>
                <p className="mt-2 font-mono text-[9px] text-[#94a2a6]">{whiteboardItems.length} shared marks · double-click a mark to remove it</p>
              </div>
            </div>}

          {activeTab === 'layers' && <div className="space-y-2">{nodes.map((node, index) => <button key={node.id} data-testid={`layer-row-${node.id}`} onClick={() => selectNode(node)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selectedId === node.id ? 'border-[#a7d0c4] bg-[#e8f5f1]' : 'border-[#d9e2e4] bg-white hover:border-[#b7d4ce]'}`}><span className="w-5 font-mono text-[9px] text-[#a0adb1]">0{index + 1}</span><span className="flex h-7 w-7 items-center justify-center rounded-lg font-mono text-[9px] font-bold" style={{ color: typeMeta[node.type].color, backgroundColor: typeMeta[node.type].bg }}>{typeMeta[node.type].short}</span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold text-[#43565c]">{node.label}</span><span className="block truncate text-[9px] text-[#89969b]">{node.content}</span></span>{node.lockedBy ? <Lock size={12} style={{ color: collaborators.find((person) => person.id === node.lockedBy)?.accent }} /> : <span className="h-1.5 w-1.5 rounded-full bg-[#a8bbb8]" />}</button>)}</div>}

          {activeTab === 'activity' && <div className="space-y-0"><div className="mb-4 flex items-center justify-between rounded-xl border border-[#d7e1e3] bg-white p-3.5"><div className="flex items-center gap-2"><Activity size={14} className="text-[#177461]" /><span className="text-[11px] font-bold text-[#41555b]">Protocol stream</span></div><span className={`h-2 w-2 rounded-full ${isSimulating ? 'animate-pulse bg-[#e1844c]' : 'bg-[#2e9a7e]'}`} /></div>{isSimulating && <div data-testid="status-simulation" className="mb-4 rounded-xl border border-[#e7c5a8] bg-[#fff3e8] p-3"><div className="mb-2 flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[.14em] text-[#b96a39]">Live resolution</span><span className="text-[9px] text-[#bf8258]">RUNNING</span></div><p className="text-[11px] font-semibold text-[#805235]">{simStatus}</p><div className="mt-3 h-1 overflow-hidden rounded-full bg-[#f1d7c2]"><div className="animate-pulse-line h-full w-full bg-[#e1844c]" /></div></div>}{visibleEvents.map((event, index) => <div key={event.id} data-testid={`activity-event-${event.id}`} className="animate-slide-in relative flex gap-3 border-l border-[#d5e0e2] pb-5 pl-5" style={{ animationDelay: `${index * 30}ms` }}><span className={`absolute -left-[5px] top-0 h-[9px] w-[9px] rounded-full border-2 border-[#f8fafb] ${event.outcome === 'resolved' ? 'bg-[#177461]' : event.outcome === 'blocked' ? 'bg-[#e1844c]' : event.outcome === 'observed' ? 'bg-[#8aa0a7]' : 'bg-[#4a9a86]'}`} /><div className="min-w-0 flex-1"><div className="flex items-baseline justify-between gap-2"><p className="text-[11px] font-bold text-[#53666c]">{event.action} <span className="font-normal text-[#7f9095]">{event.target}</span></p><time className="font-mono text-[8px] text-[#9aa7aa]">{event.timestamp}</time></div><p className="mt-1 text-[10px] leading-4 text-[#819196]"><span className="font-semibold text-[#61757b]">{event.actor}</span> · {event.detail}</p><span className={`mt-2 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider ${event.outcome === 'resolved' ? 'bg-[#e0f2ed] text-[#177461]' : event.outcome === 'blocked' ? 'bg-[#fff0e3] text-[#b66438]' : event.outcome === 'observed' ? 'bg-[#e9eff1] text-[#73858b]' : 'bg-[#e4f1ed] text-[#2f806d]'}`}>{event.outcome === 'resolved' && <Check size={9} />}{event.outcome}</span></div></div>)}<div className="mt-1 rounded-xl border border-[#d7e1e3] bg-white p-4"><div className="mb-3 flex items-center gap-2"><Users size={14} className="text-[#8060a3]" /><span className="font-mono text-[9px] font-medium uppercase tracking-[.16em] text-[#71828a]">Presence</span></div>{collaborators.map((person, index) => <div key={`${person.id}-${index}`} className="mb-3 flex items-center gap-2.5 last:mb-0"><span className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-[9px] font-bold" style={{ backgroundColor: `${person.accent}19`, color: person.accent }}>{person.initials || initials(person.name)}</span><span className="flex-1 text-[11px] font-semibold text-[#52656b]">{person.id === actorId ? `${person.name} (you)` : person.name}</span><span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-wider text-[#849499]"><span className="h-1.5 w-1.5 rounded-full" style={{ background: person.status === 'editing' ? person.accent : '#9aabad' }} />{person.status}</span></div>)}</div><p className="mt-4 flex items-center gap-2 font-mono text-[9px] text-[#849399]"><Link2 size={11} /> shared event log · {events.length} records</p></div>}

           {activeTab === 'code' && <div className="space-y-3"><div className="rounded-xl border border-[#d7e1e3] bg-white p-3.5"><div className="mb-3 flex items-center justify-between"><div><div className="flex items-center gap-2"><Code2 size={14} className="text-[#177461]" /><span className="text-[11px] font-bold text-[#41555b]">Website source</span></div><p className="mt-1 text-[10px] leading-4 text-[#849196]">The actual authored page output — not the Northstar editor internals.</p></div><button data-testid="button-copy-code" onClick={copyCode} className="flex items-center gap-1.5 rounded-lg border border-[#d5e0e2] bg-[#f8fafb] px-2.5 py-2 text-[10px] font-bold text-[#5d7178] hover:border-[#91c5b7] hover:text-[#177461]">{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copied' : 'Copy'}</button></div><div className="mb-3 grid grid-cols-3 rounded-lg border border-[#d7e0e3] bg-[#eef3f4] p-1">{([['html', 'index.html'], ['css', 'styles.css'], ['js', 'script.js']] as const).map(([tab, label]) => <button key={tab} data-testid={`button-code-${tab}`} onClick={() => setCodeTab(tab)} className={`rounded-md py-2 font-mono text-[10px] font-bold transition ${codeTab === tab ? 'bg-white text-[#177461] shadow-sm' : 'text-[#819097] hover:text-[#496169]'}`}>{label}</button>)}</div><div className="mb-2 flex items-center justify-between font-mono text-[9px] text-[#8a999e]"><span>website/{codeTab === 'html' ? 'index.html' : codeTab === 'css' ? 'styles.css' : 'script.js'}</span><span>{codeValue.split('\\n').length} lines · {nodes.length} shared nodes</span></div><div className="code-scroll rounded-lg border border-[#243e40] bg-[#183437] p-3"><pre data-testid={`code-output-${codeTab}`} className="font-mono text-[10px] leading-[1.65] text-[#cce8de]">{codeValue}</pre></div></div><div className="rounded-xl border border-[#d7e5e1] bg-[#edf7f4] p-3.5"><div className="flex items-center gap-2 text-[#177461]"><Clipboard size={13} /><span className="text-[11px] font-bold">Website export</span></div><p className="mt-2 text-[10px] leading-4 text-[#648079]">These three files are generated from the shared DOM tree. HTML contains every block and data-node-id; CSS contains the page layout; JS contains the page behavior.</p><div className="mt-3 border-t border-[#d5e9e3] pt-3 font-mono text-[9px] text-[#78928c]">CRDT {crdtStatus.algorithm} · clock {crdtStatus.clock} · {crdtStatus.operations} merged operations</div></div></div>}
        </aside>
      </div>
    </main>
  );
}

export default Editor;