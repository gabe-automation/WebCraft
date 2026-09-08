import { useMemo, useState } from 'react';
import {
  Activity,
  AlignLeft,
  ArrowUpRight,
  Box,
  Check,
  ChevronDown,
  CircleHelp,
  Eye,
  Globe2,
  Heading1,
  Layers3,
  LayoutTemplate,
  Link2,
  Lock,
  MousePointer2,
  PanelRight,
  RefreshCcw,
  Save,
  Settings2,
  ShieldCheck,
  Square,
  Type,
  Unlock,
  Users,
  WandSparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';

type NodeType = 'PAGE' | 'HEADING' | 'TEXT' | 'BUTTON' | 'SECTION';

type PageNode = {
  id: string;
  type: NodeType;
  label: string;
  content: string;
  lockedBy: string | null;
  position: number;
  lastEditedBy: string;
};

type Collaborator = {
  id: string;
  name: string;
  initials: string;
  accent: string;
  status: 'editing' | 'watching' | 'idle';
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

const collaborators: Collaborator[] = [
  { id: 'you', name: 'You', initials: 'YN', accent: '#177461', status: 'editing' },
  { id: 'mira', name: 'Mira Chen', initials: 'MC', accent: '#e1844c', status: 'watching' },
];

const seedNodes: PageNode[] = [
  { id: 'root', type: 'PAGE', label: 'Home page', content: 'Studio home', lockedBy: null, position: 0, lastEditedBy: 'you' },
  { id: 'hero', type: 'HEADING', label: 'Hero heading', content: 'Make space for better work.', lockedBy: 'you', position: 1, lastEditedBy: 'you' },
  { id: 'intro', type: 'TEXT', label: 'Intro copy', content: 'A calm workspace for small teams to shape ideas together, without stepping on each other.', lockedBy: null, position: 2, lastEditedBy: 'mira' },
  { id: 'cta', type: 'BUTTON', label: 'Primary action', content: 'Start a project', lockedBy: null, position: 3, lastEditedBy: 'you' },
  { id: 'proof', type: 'SECTION', label: 'Feature section', content: 'Built for momentum, designed for clarity.', lockedBy: 'mira', position: 4, lastEditedBy: 'mira' },
];

const seedEvents: ActivityEvent[] = [
  { id: 'evt-5', actor: 'Mira Chen', action: 'edited', target: 'Intro copy', detail: 'Updated copy to explain the workspace', outcome: 'applied', timestamp: '09:41:08' },
  { id: 'evt-4', actor: 'You', action: 'locked', target: 'Hero heading', detail: 'Acquired exclusive edit lease', outcome: 'applied', timestamp: '09:40:52' },
  { id: 'evt-3', actor: 'Mira Chen', action: 'selected', target: 'Hero heading', detail: 'Watching current selection', outcome: 'observed', timestamp: '09:40:37' },
  { id: 'evt-2', actor: 'You', action: 'created', target: 'Feature section', detail: 'Inserted SECTION at position 5', outcome: 'applied', timestamp: '09:39:12' },
];

const blockOptions: Array<{ type: Exclude<NodeType, 'PAGE'>; label: string; detail: string; icon: LucideIcon; tint: string }> = [
  { type: 'HEADING', label: 'Heading', detail: 'A bold title', icon: Heading1, tint: '#177461' },
  { type: 'TEXT', label: 'Text', detail: 'Paragraph copy', icon: AlignLeft, tint: '#587493' },
  { type: 'BUTTON', label: 'Button', detail: 'A clear action', icon: Square, tint: '#cf743f' },
  { type: 'SECTION', label: 'Section', detail: 'A content region', icon: LayoutTemplate, tint: '#8060a3' },
];

const typeMeta: Record<NodeType, { short: string; color: string; bg: string }> = {
  PAGE: { short: 'PG', color: '#526b78', bg: '#e7eef2' },
  HEADING: { short: 'H1', color: '#177461', bg: '#d9eee8' },
  TEXT: { short: 'TX', color: '#587493', bg: '#e2eaf3' },
  BUTTON: { short: 'BT', color: '#cf743f', bg: '#f8e4d8' },
  SECTION: { short: 'SE', color: '#8060a3', bg: '#ede4f3' },
};

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function Editor() {
  const [nodes, setNodes] = useState<PageNode[]>(seedNodes);
  const [events, setEvents] = useState<ActivityEvent[]>(seedEvents);
  const [selectedId, setSelectedId] = useState('hero');
  const [activeCollaborator, setActiveCollaborator] = useState('you');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStatus, setSimStatus] = useState('Ready to simulate');
  const [activeTab, setActiveTab] = useState<'design' | 'layers' | 'activity'>('design');
  const [zoom, setZoom] = useState(100);
  const [isPreview, setIsPreview] = useState(false);
  const [published, setPublished] = useState(false);
  const [saveState, setSaveState] = useState('All changes saved locally');

  const activeUser = collaborators.find((collaborator) => collaborator.id === activeCollaborator) ?? collaborators[0];
  const selectedNode = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  const activeLocks = nodes.filter((node) => node.lockedBy);
  const canEdit = !selectedNode.lockedBy || selectedNode.lockedBy === activeCollaborator;
  const recentlyResolved = events.some((event) => event.outcome === 'resolved');
  const visibleEvents = useMemo(() => events.slice(0, 8), [events]);

  const addEvent = (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    setEvents((current) => [{ ...event, id: `evt-${Date.now()}-${current.length}`, timestamp: formatTime() }, ...current].slice(0, 12));
  };

  const selectNode = (node: PageNode) => {
    setSelectedId(node.id);
    addEvent({
      actor: activeUser.name,
      action: 'selected',
      target: node.label,
      detail: 'Inspector is now observing this node',
      outcome: 'observed',
    });
  };

  const updateNode = (key: 'label' | 'content', value: string) => {
    if (!canEdit) return;
    setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, [key]: value, lastEditedBy: activeCollaborator } : node));
    setSaveState('Saving local change…');
    window.setTimeout(() => setSaveState('All changes saved locally'), 450);
  };

  const commitEdit = (field: string) => {
    if (!canEdit) return;
    addEvent({
      actor: activeUser.name,
      action: 'edited',
      target: selectedNode.label,
      detail: `Committed ${field} change under active lease`,
      outcome: 'applied',
    });
  };

  const toggleLock = (node: PageNode) => {
    if (node.lockedBy && node.lockedBy !== activeCollaborator) {
      addEvent({
        actor: activeUser.name,
        action: 'requested lock',
        target: node.label,
        detail: `${collaborators.find((person) => person.id === node.lockedBy)?.name ?? 'Another collaborator'} owns the lease`,
        outcome: 'blocked',
      });
      return;
    }
    const nextLockedBy = node.lockedBy ? null : activeCollaborator;
    setNodes((current) => current.map((item) => item.id === node.id ? { ...item, lockedBy: nextLockedBy } : item));
    addEvent({
      actor: activeUser.name,
      action: nextLockedBy ? 'locked' : 'unlocked',
      target: node.label,
      detail: nextLockedBy ? 'Acquired exclusive edit lease' : 'Released edit lease',
      outcome: 'applied',
    });
  };

  const addNode = (type: Exclude<NodeType, 'PAGE'>) => {
    const copy: Record<Exclude<NodeType, 'PAGE'>, { label: string; content: string }> = {
      HEADING: { label: 'New heading', content: 'A new point of view.' },
      TEXT: { label: 'New text block', content: 'Write something useful here.' },
      BUTTON: { label: 'New button', content: 'Explore more' },
      SECTION: { label: 'New section', content: 'A fresh region for your story.' },
    };
    const nextNode: PageNode = {
      id: `node-${Date.now()}`,
      type,
      label: copy[type].label,
      content: copy[type].content,
      lockedBy: activeCollaborator,
      position: nodes.length,
      lastEditedBy: activeCollaborator,
    };
    setNodes((current) => [...current, nextNode]);
    setSelectedId(nextNode.id);
    setActiveTab('design');
    addEvent({
      actor: activeUser.name,
      action: 'created',
      target: nextNode.label,
      detail: `Inserted ${type} at position ${nextNode.position + 1} with a lease`,
      outcome: 'applied',
    });
  };

  const runSimulation = () => {
    if (isSimulating) return;
    const target = nodes.find((node) => node.id === 'hero') ?? nodes[1];
    setIsSimulating(true);
    setSimStatus('Two writes are in flight…');
    addEvent({
      actor: 'Simulation',
      action: 'started',
      target: target.label,
      detail: 'You and Mira Chen entered the same edit window',
      outcome: 'observed',
    });
    window.setTimeout(() => {
      setSimStatus('Conflict detected');
      addEvent({
        actor: 'Mira Chen',
        action: 'edited',
        target: target.label,
        detail: 'Proposed “Make room for edge cases.” at revision 14',
        outcome: 'blocked',
      });
    }, 650);
    window.setTimeout(() => {
      setSimStatus('Resolving with lease priority…');
      addEvent({
        actor: 'Protocol',
        action: 'resolved',
        target: target.label,
        detail: 'Mira’s write deferred; active lease retained by You',
        outcome: 'resolved',
      });
      setNodes((current) => current.map((node) => node.id === target.id ? { ...node, content: 'Make space for better work.', lockedBy: 'you', lastEditedBy: 'you' } : node));
    }, 1250);
    window.setTimeout(() => {
      setIsSimulating(false);
      setSimStatus('Resolved deterministically');
    }, 1900);
  };

  const resetEditor = () => {
    setNodes(seedNodes);
    setEvents(seedEvents);
    setSelectedId('hero');
    setActiveCollaborator('you');
    setSimStatus('Ready to simulate');
    setIsSimulating(false);
    setIsPreview(false);
    setPublished(false);
    addEvent({ actor: 'You', action: 'reset', target: 'Home page', detail: 'Restored the local collaboration sandbox', outcome: 'applied' });
  };

  const publishPage = () => {
    setPublished(true);
    addEvent({ actor: activeUser.name, action: 'published', target: 'Home page', detail: 'Created a local preview snapshot', outcome: 'applied' });
  };

  return (
    <main className="min-h-[100dvh] bg-[#e7edf2] font-sans text-[#202b32]">
      <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-[#cdd8de] bg-[#fbfcfc] px-4 py-3 shadow-[0_1px_0_rgba(40,57,67,.04)] md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#173e3b] text-[#c6eee5] shadow-[0_5px_12px_rgba(23,62,59,.2)]">
            <WandSparkles size={18} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[15px] font-bold tracking-[-.03em] text-[#1f3034]">Northstar Studio</h1>
              <span className="hidden rounded-full bg-[#e4f2ee] px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[.12em] text-[#177461] sm:inline">Local workspace</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#73818a]"><Globe2 size={11} /> Home page <ChevronDown size={12} /></div>
          </div>
        </div>
        <div className="order-3 flex w-full items-center justify-between gap-2 sm:order-none sm:w-auto">
          <div className="hidden items-center gap-2 rounded-full border border-[#d9e1e4] bg-[#f5f8f8] px-3 py-1.5 md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2e9a7e]" />
            <span data-testid="status-save" className="font-mono text-[10px] text-[#657780]">{saveState}</span>
          </div>
          <button data-testid="button-preview" onClick={() => { setIsPreview((value) => !value); addEvent({ actor: activeUser.name, action: isPreview ? 'closed preview' : 'opened preview', target: 'Home page', detail: 'Switched canvas presentation mode', outcome: 'observed' }); }} className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-[11px] font-semibold transition hover:-translate-y-0.5 ${isPreview ? 'border-[#177461] bg-[#e3f3ef] text-[#177461]' : 'border-[#d3dde1] bg-white text-[#52646c] hover:border-[#177461]/50'}`}>
            <Eye size={14} /> {isPreview ? 'Back to edit' : 'Preview'}
          </button>
          <button data-testid="button-publish" onClick={publishPage} className="flex h-9 items-center gap-2 rounded-lg bg-[#e1844c] px-3.5 text-[11px] font-bold text-[#2b1d18] transition hover:-translate-y-0.5 hover:bg-[#ee9661]">
            <ArrowUpRight size={14} /> {published ? 'Published' : 'Publish'}
          </button>
          <button data-testid="button-reset-editor" onClick={resetEditor} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d3dde1] bg-white text-[#71828a] transition hover:border-[#cf743f]/50 hover:text-[#cf743f]" aria-label="Reset editor">
            <RefreshCcw size={14} />
          </button>
        </div>
      </header>

      <div className="grid min-h-[calc(100dvh-72px)] grid-cols-1 xl:grid-cols-[238px_minmax(520px,1fr)_326px]">
        <aside className="builder-scrollbar border-b border-[#cdd8de] bg-[#f8fafb] p-4 lg:border-r lg:border-b-0">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[.18em] text-[#6f8089]">Insert</p>
              <h2 className="mt-1 text-[15px] font-bold tracking-[-.03em] text-[#26373c]">Build your page</h2>
            </div>
            <button data-testid="button-help" className="flex h-7 w-7 items-center justify-center rounded-full text-[#8b9aa1] transition hover:bg-[#e8eff1] hover:text-[#177461]" aria-label="Builder help"><CircleHelp size={15} /></button>
          </div>
          <div className="mb-6 grid grid-cols-2 gap-2">
            {blockOptions.map((block) => {
              const Icon = block.icon;
              return (
                <button key={block.type} data-testid={`button-add-${block.type.toLowerCase()}`} onClick={() => addNode(block.type)} className="group rounded-xl border border-[#dce4e7] bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-[#accbc3] hover:shadow-[0_8px_18px_rgba(43,70,74,.09)]">
                  <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${block.tint}16`, color: block.tint }}><Icon size={16} strokeWidth={1.8} /></span>
                  <span className="block text-[12px] font-bold text-[#33454b]">{block.label}</span>
                  <span className="mt-1 block text-[10px] leading-4 text-[#87959b]">{block.detail}</span>
                </button>
              );
            })}
          </div>
          <div className="mb-4 flex items-center justify-between border-t border-[#dde5e7] pt-4">
            <div className="flex items-center gap-2"><Layers3 size={14} className="text-[#177461]" /><span className="font-mono text-[10px] font-medium uppercase tracking-[.16em] text-[#71818a]">Layers</span></div>
            <span data-testid="text-node-count" className="rounded-full bg-[#e4ecef] px-2 py-0.5 font-mono text-[10px] text-[#70818a]">{nodes.length}</span>
          </div>
          <div className="space-y-1.5">
            {nodes.map((node) => {
              const lockOwner = collaborators.find((person) => person.id === node.lockedBy);
              const isSelected = node.id === selectedId;
              const meta = typeMeta[node.type];
              return (
                <button key={node.id} data-testid={`node-${node.id}`} onClick={() => selectNode(node)} className={`group flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition ${isSelected ? 'border-[#9bcabd] bg-[#e5f3ef] shadow-[inset_3px_0_0_#177461]' : 'border-transparent hover:border-[#d9e3e6] hover:bg-white'}`}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[9px] font-bold" style={{ color: meta.color, backgroundColor: meta.bg }}>{meta.short}</span>
                  <span className="min-w-0 flex-1"><span className={`block truncate text-[11px] font-semibold ${isSelected ? 'text-[#177461]' : 'text-[#405159]'}`}>{node.label}</span><span className="mt-0.5 block truncate font-mono text-[9px] text-[#95a2a7]">/{node.type.toLowerCase()}</span></span>
                  {lockOwner && <Lock size={12} style={{ color: lockOwner.accent }} />}
                </button>
              );
            })}
          </div>
          <div className="mt-6 rounded-xl border border-[#d7e5e1] bg-[#edf7f4] p-3.5">
            <div className="mb-2 flex items-center gap-2 text-[#177461]"><ShieldCheck size={14} /><span className="text-[11px] font-bold">Conflict-aware canvas</span></div>
            <p className="text-[10px] leading-4 text-[#648079]">Every node has a visible lease. Edits never disappear silently.</p>
          </div>
        </aside>

        <section className="grid-surface min-w-0 border-b border-[#cdd8de] p-4 md:p-6 lg:border-r lg:border-b-0">
          <div className="mx-auto flex w-full max-w-[860px] flex-col">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-[#819099]"><span className="text-[#177461]">Canvas</span><span className="text-[#a9b4b8]">/</span><span>Home page</span></div>
                <h2 className="text-[26px] font-bold tracking-[-.06em] text-[#24363a] md:text-[32px]">Shape the story.</h2>
                <p className="mt-1 text-[12px] text-[#73838a]">Select any block to edit its content or inspect its lease.</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#d4dee1] bg-[#f8faf9] p-1">
                {collaborators.map((collaborator) => (
                  <button key={collaborator.id} data-testid={`button-collaborator-${collaborator.id}`} onClick={() => { setActiveCollaborator(collaborator.id); addEvent({ actor: collaborator.name, action: 'joined', target: 'Workspace', detail: 'Switched active editing perspective', outcome: 'observed' }); }} className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold transition ${activeCollaborator === collaborator.id ? 'bg-white text-[#33484e] shadow-sm' : 'text-[#819097] hover:text-[#4d6168]'}`}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full font-mono text-[8px] font-bold" style={{ backgroundColor: `${collaborator.accent}19`, color: collaborator.accent }}>{collaborator.initials}</span>{collaborator.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="soft-shadow overflow-hidden rounded-2xl border border-[#c6d3d7] bg-[#fbfcfb]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce3e3] bg-[#f8faf9] px-4 py-3">
                <div className="flex items-center gap-2.5"><div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-[#e1844c]" /><span className="h-2 w-2 rounded-full bg-[#e9be61]" /><span className="h-2 w-2 rounded-full bg-[#61a892]" /></div><span className="ml-1 font-mono text-[10px] text-[#819096]">northstar.local / preview</span></div>
                <div className="flex items-center gap-3"><div className="flex items-center gap-1.5 font-mono text-[9px] text-[#71838a]"><span className="h-1.5 w-1.5 rounded-full bg-[#2e9a7e]" /> LIVE LOCAL</div><div className="flex items-center gap-1 rounded-md border border-[#d6e0e1] bg-white px-1.5 py-1"><button data-testid="button-zoom-out" onClick={() => setZoom((value) => Math.max(80, value - 10))} className="px-1 text-[#708087] hover:text-[#177461]" aria-label="Zoom out">−</button><span data-testid="status-zoom" className="min-w-[32px] text-center font-mono text-[9px] text-[#6d7b81]">{zoom}%</span><button data-testid="button-zoom-in" onClick={() => setZoom((value) => Math.min(120, value + 10))} className="px-1 text-[#708087] hover:text-[#177461]" aria-label="Zoom in">+</button></div></div>
              </div>
              <div className={`canvas-grid builder-scrollbar min-h-[520px] overflow-auto p-5 transition-opacity sm:p-10 ${isPreview ? 'cursor-default' : ''}`}>
                <div className="mx-auto min-w-[320px] max-w-[660px] bg-[#fffdfa] text-[#27383b] shadow-[0_12px_35px_rgba(44,62,68,.1)]" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', marginBottom: `${(zoom - 100) * 2}px` }}>
                  <div className="flex items-center justify-between border-b border-[#ece8df] px-6 py-5 sm:px-9">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#1e6157]"><span className="h-2 w-2 rounded-full bg-[#e1844c]" /> northstar</div>
                    <div className="hidden items-center gap-5 text-[10px] text-[#879390] sm:flex"><span>About</span><span>Work</span><span>Contact</span></div>
                    <button data-testid="button-canvas-menu" className="rounded-md border border-[#dfe5df] px-2 py-1 text-[10px] text-[#71817e] sm:hidden" aria-label="Open page menu"><PanelRight size={12} /></button>
                  </div>
                  <div className="p-6 sm:p-9">
                    {nodes.filter((node) => node.type !== 'PAGE').map((node) => {
                      const isSelected = node.id === selectedId;
                      const owner = collaborators.find((person) => person.id === node.lockedBy);
                      const lastEditor = collaborators.find((person) => person.id === node.lastEditedBy);
                      return (
                        <div key={node.id} data-testid={`canvas-node-${node.id}`} role="button" tabIndex={0} onClick={() => !isPreview && selectNode(node)} onKeyDown={(event) => { if (event.key === 'Enter') selectNode(node); }} className={`group relative mb-3 rounded-xl border-2 p-4 outline-none transition ${isSelected && !isPreview ? 'selection-ring border-[#258b79] bg-[#f0faf6]' : 'border-transparent hover:border-[#cbded8] hover:bg-[#fbfdf9]'}`}>
                          {!isPreview && <div className={`absolute -top-3 left-3 z-10 items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[9px] font-medium text-white shadow-sm ${isSelected ? 'flex bg-[#177461]' : 'hidden group-hover:flex bg-[#58736f]'}`}><MousePointer2 size={10} /> {node.label}<span className="ml-1 opacity-70">· {node.type.toLowerCase()}</span></div>}
                          {!isPreview && owner && <div className="absolute -right-2 -top-3 z-10 flex items-center gap-1.5 rounded-full border border-white bg-white px-2 py-1 font-mono text-[9px] shadow-sm" style={{ color: owner.accent }}><Lock size={10} /> {owner.id === activeCollaborator ? 'your lease' : owner.name}</div>}
                          {node.type === 'HEADING' && <h3 className="max-w-[510px] text-[clamp(32px,5vw,62px)] font-bold leading-[.93] tracking-[-.08em] text-[#274047]">{node.content}</h3>}
                          {node.type === 'TEXT' && <p className="max-w-[500px] text-[14px] leading-6 text-[#71817d]">{node.content}</p>}
                          {node.type === 'BUTTON' && <span className="inline-flex items-center gap-2 rounded-lg bg-[#214b47] px-4 py-3 text-[12px] font-bold text-[#effaf6]">{node.content}<ArrowUpRight size={14} /></span>}
                          {node.type === 'SECTION' && <div className="rounded-lg border border-[#e8e0d6] bg-[#f7f2e9] p-5"><div className="mb-3 flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[.16em] text-[#b58362]">A considered section</span><Box size={15} className="text-[#c89572]" /></div><p className="text-[18px] font-semibold tracking-[-.03em] text-[#455b5b]">{node.content}</p></div>}
                          {node.id === 'intro' && !isPreview && <div className="absolute -right-4 bottom-2 flex items-center gap-1.5 rounded-full border border-white bg-[#e1844c] px-2 py-1 font-mono text-[9px] font-bold text-[#fff8f2] shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-white" /> MC is here</div>}
                          {isSelected && !isPreview && <div className="mt-3 flex items-center gap-2 border-t border-[#d6e9e3] pt-2 font-mono text-[9px] text-[#78928c]"><span className="flex items-center gap-1 text-[#177461]"><Save size={10} /> selected</span><span>·</span><span>{lastEditor?.name ?? 'Unknown'} last edited</span></div>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-[#ece8df] px-6 py-4 text-[9px] uppercase tracking-[.16em] text-[#a0aaa4] sm:px-9">Made together, one visible decision at a time.</div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[#dce3e3] bg-[#f8faf9] px-4 py-2.5"><span data-testid="status-render" className="font-mono text-[9px] text-[#809097]">rendered locally · {nodes.length} DOM nodes</span><span className="flex items-center gap-1.5 font-mono text-[9px] text-[#2e8f78]"><Check size={11} /> synced</span></div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="flex items-center gap-3 rounded-xl border border-[#d5e0e2] bg-[#f8faf9] p-3.5"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e3f2ee] text-[#177461]"><Settings2 size={15} /></div><div className="min-w-0"><p className="text-[11px] font-bold text-[#43565c]">Editing {selectedNode.label}</p><p className="mt-0.5 truncate text-[10px] text-[#849196]">{canEdit ? 'You can write while the lease is available.' : `${collaborators.find((person) => person.id === selectedNode.lockedBy)?.name} currently owns this node.`}</p></div><span data-testid="status-selected-lease" className={`ml-auto shrink-0 rounded-full px-2 py-1 font-mono text-[9px] ${canEdit ? 'bg-[#e0f1ec] text-[#177461]' : 'bg-[#f8e7d9] text-[#b66438]'}`}>{canEdit ? 'editable' : 'read only'}</span></div>
              <button data-testid="button-run-simulation" onClick={runSimulation} disabled={isSimulating} className={`group flex min-h-[70px] min-w-[178px] items-center justify-between gap-5 rounded-xl border px-4 py-3 text-left transition ${isSimulating ? 'border-[#d6a26d] bg-[#fff1e6]' : recentlyResolved ? 'border-[#9bcabd] bg-[#e9f7f2] hover:border-[#177461]' : 'border-[#bedbd3] bg-[#eff9f5] hover:-translate-y-0.5 hover:border-[#177461]'}`}><span className="flex items-center gap-2.5"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${isSimulating ? 'bg-[#f8dfca] text-[#c8753c]' : 'bg-[#d9eee8] text-[#177461]'}`}><Zap size={15} /></span><span><span className="block text-[11px] font-bold text-[#38535a]">{isSimulating ? 'Running protocol' : 'Race two edits'}</span><span className="mt-0.5 block font-mono text-[9px] text-[#849397]">{isSimulating ? simStatus : 'See resolution in action'}</span></span></span><ArrowUpRight size={14} className="text-[#5c7a77] transition group-hover:translate-x-0.5" /></button>
            </div>
          </div>
        </section>

        <aside className="builder-scrollbar max-h-[none] overflow-y-auto bg-[#f8fafb] p-4 md:p-5 xl:max-h-[calc(100dvh-72px)]">
          <div className="mb-5 flex items-center justify-between"><div><p className="font-mono text-[10px] font-medium uppercase tracking-[.18em] text-[#70818a]">Workspace panel</p><h2 className="mt-1 text-[15px] font-bold tracking-[-.03em] text-[#26373c]">Inspector</h2></div><button data-testid="button-panel-settings" className="flex h-7 w-7 items-center justify-center rounded-md text-[#87969c] transition hover:bg-[#e8eff1] hover:text-[#177461]" aria-label="Inspector settings"><Settings2 size={14} /></button></div>
          <div className="mb-5 grid grid-cols-3 rounded-lg border border-[#d7e0e3] bg-[#eef3f4] p-1">
            {([['design', 'Design', Settings2], ['layers', 'Layers', Layers3], ['activity', 'Activity', Activity]] as const).map(([tab, label, Icon]) => <button key={tab} data-testid={`button-tab-${tab}`} onClick={() => setActiveTab(tab)} className={`flex items-center justify-center gap-1 rounded-md py-2 text-[10px] font-bold transition ${activeTab === tab ? 'bg-white text-[#177461] shadow-sm' : 'text-[#819097] hover:text-[#496169]'}`}><Icon size={12} />{label}</button>)}
          </div>

          {activeTab === 'design' && <div className="space-y-4">
            <div className="rounded-xl border border-[#d7e1e3] bg-white p-4">
              <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ color: typeMeta[selectedNode.type].color, backgroundColor: typeMeta[selectedNode.type].bg }}><Type size={14} /></span><div><p data-testid="text-selected-node" className="text-[12px] font-bold text-[#34484e]">{selectedNode.label}</p><p className="font-mono text-[9px] uppercase tracking-[.12em] text-[#91a0a5]">{selectedNode.type} node</p></div></div><span className={`flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[9px] ${selectedNode.lockedBy ? 'bg-[#f8e8da] text-[#b8653a]' : 'bg-[#e4f2ed] text-[#237a67]'}`}>{selectedNode.lockedBy ? <Lock size={10} /> : <Unlock size={10} />}{selectedNode.lockedBy ? 'leased' : 'open'}</span></div>
              <label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[.14em] text-[#849399]" htmlFor="node-label">Layer name</label>
              <input id="node-label" data-testid="input-node-label" value={selectedNode.label} onChange={(event) => updateNode('label', event.target.value)} onBlur={() => commitEdit('layer name')} disabled={!canEdit} className="w-full rounded-lg border border-[#d8e1e3] bg-[#f8fafb] px-3 py-2.5 text-[12px] font-semibold text-[#3d5157] outline-none transition placeholder:text-[#a5afb2] focus:border-[#65a998] disabled:cursor-not-allowed disabled:opacity-50" />
              <label className="mb-1.5 mt-4 block font-mono text-[9px] uppercase tracking-[.14em] text-[#849399]" htmlFor="node-content">Content</label>
              <textarea id="node-content" data-testid="input-node-content" value={selectedNode.content} onChange={(event) => updateNode('content', event.target.value)} onBlur={() => commitEdit('content')} disabled={!canEdit} rows={4} className="w-full resize-none rounded-lg border border-[#d8e1e3] bg-[#f8fafb] px-3 py-2.5 text-[12px] leading-5 text-[#52656b] outline-none transition focus:border-[#65a998] disabled:cursor-not-allowed disabled:opacity-50" />
              <button data-testid="button-toggle-lock" onClick={() => toggleLock(selectedNode)} className={`mt-3 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-[11px] font-bold transition ${selectedNode.lockedBy === activeCollaborator ? 'border-[#9bcabd] bg-[#e3f3ee] text-[#177461]' : selectedNode.lockedBy ? 'border-[#e8c6a9] bg-[#fff2e7] text-[#b66438]' : 'border-[#d6e0e2] bg-[#f6f9f9] text-[#62767c] hover:border-[#91c5b7] hover:text-[#177461]'}`}><span className="flex items-center gap-2">{selectedNode.lockedBy ? <Lock size={13} /> : <Unlock size={13} />}{selectedNode.lockedBy === activeCollaborator ? 'Release your lease' : selectedNode.lockedBy ? `Leased by ${collaborators.find((person) => person.id === selectedNode.lockedBy)?.name}` : 'Acquire edit lease'}</span><ArrowUpRight size={12} /></button>
              <div className="mt-3 flex items-center justify-between font-mono text-[9px] text-[#8c9b9f]"><span>{canEdit ? 'writes allowed' : 'writes blocked by protocol'}</span><span>edited by {collaborators.find((person) => person.id === selectedNode.lastEditedBy)?.name}</span></div>
            </div>
            <div className="rounded-xl border border-[#d7e1e3] bg-[#f2f7f6] p-4"><div className="mb-2 flex items-center gap-2 text-[#177461]"><Lock size={13} /><span className="text-[11px] font-bold">Lease protocol</span></div><p className="text-[10px] leading-4 text-[#70847f]">The active writer keeps the lease. A competing write is recorded, then deferred — never silently merged.</p><div className="mt-3 flex items-center justify-between border-t border-[#dbe8e4] pt-3 font-mono text-[9px] text-[#7d918c]"><span>{activeLocks.length} active leases</span><span>revision 14</span></div></div>
          </div>}

          {activeTab === 'layers' && <div className="space-y-2">
            {nodes.map((node, index) => <button key={node.id} data-testid={`layer-row-${node.id}`} onClick={() => selectNode(node)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selectedId === node.id ? 'border-[#a7d0c4] bg-[#e8f5f1]' : 'border-[#d9e2e4] bg-white hover:border-[#b7d4ce]'}`}><span className="w-5 font-mono text-[9px] text-[#a0adb1]">0{index + 1}</span><span className="flex h-7 w-7 items-center justify-center rounded-lg font-mono text-[9px] font-bold" style={{ color: typeMeta[node.type].color, backgroundColor: typeMeta[node.type].bg }}>{typeMeta[node.type].short}</span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold text-[#43565c]">{node.label}</span><span className="block truncate text-[9px] text-[#89969b]">{node.content}</span></span>{node.lockedBy ? <Lock size={12} style={{ color: collaborators.find((person) => person.id === node.lockedBy)?.accent }} /> : <span className="h-1.5 w-1.5 rounded-full bg-[#a8bbb8]" />}</button>)}
          </div>}

          {activeTab === 'activity' && <div className="space-y-0">
            <div className="mb-4 flex items-center justify-between rounded-xl border border-[#d7e1e3] bg-white p-3.5"><div className="flex items-center gap-2"><Activity size={14} className="text-[#177461]" /><span className="text-[11px] font-bold text-[#41555b]">Protocol stream</span></div><span className={`h-2 w-2 rounded-full ${isSimulating ? 'animate-pulse bg-[#e1844c]' : 'bg-[#2e9a7e]'}`} /></div>
            {isSimulating && <div data-testid="status-simulation" className="mb-4 rounded-xl border border-[#e7c5a8] bg-[#fff3e8] p-3"><div className="mb-2 flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[.14em] text-[#b96a39]">Live resolution</span><span className="text-[9px] text-[#bf8258]">RUNNING</span></div><p className="text-[11px] font-semibold text-[#805235]">{simStatus}</p><div className="mt-3 h-1 overflow-hidden rounded-full bg-[#f1d7c2]"><div className="animate-pulse-line h-full w-full bg-[#e1844c]" /></div></div>}
            {visibleEvents.map((event, index) => <div key={event.id} data-testid={`activity-event-${event.id}`} className="animate-slide-in relative flex gap-3 border-l border-[#d5e0e2] pb-5 pl-5" style={{ animationDelay: `${index * 30}ms` }}><span className={`absolute -left-[5px] top-0 h-[9px] w-[9px] rounded-full border-2 border-[#f8fafb] ${event.outcome === 'resolved' ? 'bg-[#177461] shadow-[0_0_0_3px_rgba(23,116,97,.12)]' : event.outcome === 'blocked' ? 'bg-[#e1844c]' : event.outcome === 'observed' ? 'bg-[#8aa0a7]' : 'bg-[#4a9a86]'}`} /><div className="min-w-0 flex-1"><div className="flex items-baseline justify-between gap-2"><p className="text-[11px] font-bold text-[#53666c]">{event.action} <span className="font-normal text-[#7f9095]">{event.target}</span></p><time className="font-mono text-[8px] text-[#9aa7aa]">{event.timestamp}</time></div><p className="mt-1 text-[10px] leading-4 text-[#819196]"><span className="font-semibold text-[#61757b]">{event.actor}</span> · {event.detail}</p><span className={`mt-2 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider ${event.outcome === 'resolved' ? 'bg-[#e0f2ed] text-[#177461]' : event.outcome === 'blocked' ? 'bg-[#fff0e3] text-[#b66438]' : event.outcome === 'observed' ? 'bg-[#e9eff1] text-[#73858b]' : 'bg-[#e4f1ed] text-[#2f806d]'}`}>{event.outcome === 'resolved' && <Check size={9} />}{event.outcome}</span></div></div>)}
            <div className="mt-1 rounded-xl border border-[#d7e1e3] bg-white p-4"><div className="mb-3 flex items-center gap-2"><Users size={14} className="text-[#8060a3]" /><span className="font-mono text-[9px] font-medium uppercase tracking-[.16em] text-[#71828a]">Presence</span></div>{collaborators.map((collaborator) => <div key={collaborator.id} className="mb-3 flex items-center gap-2.5 last:mb-0"><span className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-[9px] font-bold" style={{ backgroundColor: `${collaborator.accent}19`, color: collaborator.accent }}>{collaborator.initials}</span><span className="flex-1 text-[11px] font-semibold text-[#52656b]">{collaborator.name}</span><span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-wider text-[#849499]"><span className="h-1.5 w-1.5 rounded-full" style={{ background: collaborator.status === 'editing' ? collaborator.accent : '#9aabad' }} />{collaborator.status}</span></div>)}</div>
            <p className="mt-4 flex items-center gap-2 font-mono text-[9px] text-[#849399]"><Link2 size={11} /> deterministic event log · {events.length} records</p>
          </div>}
        </aside>
      </div>
    </main>
  );
}

export default Editor;