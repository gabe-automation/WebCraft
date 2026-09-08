import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Check,
  CircleDot,
  Code2,
  GripVertical,
  Lock,
  MousePointer2,
  PanelRight,
  Plus,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  Unlock,
  UsersRound,
  Zap,
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
  { id: 'you', name: 'You', initials: 'YN', accent: '#2be0c3', status: 'editing' },
  { id: 'mira', name: 'Mira Chen', initials: 'MC', accent: '#f8b84e', status: 'watching' },
];

const seedNodes: PageNode[] = [
  { id: 'root', type: 'PAGE', label: 'Page root', content: 'Conflict-Free Editor', lockedBy: null, position: 0, lastEditedBy: 'you' },
  { id: 'hero', type: 'HEADING', label: 'Hero heading', content: 'Make conflicts visible.', lockedBy: 'you', position: 1, lastEditedBy: 'you' },
  { id: 'intro', type: 'TEXT', label: 'Intro copy', content: 'A small sandbox for learning how collaborative DOM editing behaves under pressure.', lockedBy: null, position: 2, lastEditedBy: 'mira' },
  { id: 'cta', type: 'BUTTON', label: 'Primary action', content: 'Run a simulation', lockedBy: null, position: 3, lastEditedBy: 'you' },
  { id: 'proof', type: 'SECTION', label: 'Protocol note', content: 'Last writer wins only when the lock is free.', lockedBy: null, position: 4, lastEditedBy: 'mira' },
];

const seedEvents: ActivityEvent[] = [
  { id: 'evt-5', actor: 'Mira Chen', action: 'edited', target: 'Intro copy', detail: 'Updated copy to explain the sandbox', outcome: 'applied', timestamp: '09:41:08' },
  { id: 'evt-4', actor: 'You', action: 'locked', target: 'Hero heading', detail: 'Acquired exclusive edit lease', outcome: 'applied', timestamp: '09:40:52' },
  { id: 'evt-3', actor: 'Mira Chen', action: 'selected', target: 'Hero heading', detail: 'Watching current selection', outcome: 'observed', timestamp: '09:40:37' },
  { id: 'evt-2', actor: 'You', action: 'created', target: 'Protocol note', detail: 'Inserted SECTION at position 5', outcome: 'applied', timestamp: '09:39:12' },
];

const typeTone: Record<NodeType, string> = {
  PAGE: 'text-[#8da3c7] bg-[#19243a]',
  HEADING: 'text-[#2be0c3] bg-[#153634]',
  TEXT: 'text-[#bca6ff] bg-[#282040]',
  BUTTON: 'text-[#f8b84e] bg-[#382d17]',
  SECTION: 'text-[#7eb7ed] bg-[#182a40]',
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
  const [showInspector, setShowInspector] = useState(true);

  const activeUser = collaborators.find((collaborator) => collaborator.id === activeCollaborator) ?? collaborators[0];
  const selectedNode = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  const activeLocks = nodes.filter((node) => node.lockedBy);
  const recentlyResolved = events.some((event) => event.outcome === 'resolved');

  const visibleEvents = useMemo(() => events.slice(0, 7), [events]);

  const addEvent = (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    setEvents((current) => [{ ...event, id: `evt-${Date.now()}`, timestamp: formatTime() }, ...current].slice(0, 10));
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

  const updateContent = (content: string) => {
    if (!selectedNode || (selectedNode.lockedBy && selectedNode.lockedBy !== activeCollaborator)) return;
    setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, content, lastEditedBy: activeCollaborator } : node));
  };

  const commitContent = () => {
    addEvent({
      actor: activeUser.name,
      action: 'edited',
      target: selectedNode.label,
      detail: `Committed content change to ${selectedNode.type}`,
      outcome: 'applied',
    });
  };

  const addNode = () => {
    const nextTypes: NodeType[] = ['SECTION', 'TEXT', 'BUTTON'];
    const nextType = nextTypes[nodes.length % nextTypes.length];
    const nextNode: PageNode = {
      id: `node-${Date.now()}`,
      type: nextType,
      label: nextType === 'SECTION' ? 'New section' : nextType === 'BUTTON' ? 'New action' : 'New text block',
      content: nextType === 'BUTTON' ? 'New action' : nextType === 'SECTION' ? 'A new editable region.' : 'Write something here.',
      lockedBy: activeCollaborator,
      position: nodes.length,
      lastEditedBy: activeCollaborator,
    };
    setNodes((current) => [...current, nextNode]);
    setSelectedId(nextNode.id);
    addEvent({
      actor: activeUser.name,
      action: 'created',
      target: nextNode.label,
      detail: `Inserted ${nextType} at position ${nextNode.position + 1}`,
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
        detail: 'Proposed “Design for the edge cases.” at revision 14',
        outcome: 'blocked',
      });
    }, 650);
    window.setTimeout(() => {
      setSimStatus('Resolving with lock priority…');
      addEvent({
        actor: 'Protocol',
        action: 'resolved',
        target: target.label,
        detail: 'Mira’s write deferred; active lease retained by You',
        outcome: 'resolved',
      });
      setNodes((current) => current.map((node) => node.id === target.id ? { ...node, content: 'Make conflicts visible.', lockedBy: 'you', lastEditedBy: 'you' } : node));
    }, 1250);
    window.setTimeout(() => {
      setIsSimulating(false);
      setSimStatus('Resolved deterministically');
    }, 1900);
  };

  return (
    <main className="min-h-[100dvh] bg-[#0f1320] text-[#e7edf7] font-sans">
      <header className="flex min-h-[68px] flex-wrap items-center justify-between gap-4 border-b border-[#202a3c] bg-[#111725]/95 px-5 py-3 backdrop-blur md:px-7">
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#2be0c3]/50 bg-[#153b3a] text-[#2be0c3] shadow-[0_0_28px_rgba(43,224,195,.12)]">
            <Code2 size={19} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#7e8da9]">sandbox / 01</span>
              <span className="rounded-full bg-[#173e3a] px-2 py-0.5 font-mono text-[10px] text-[#2be0c3]">LOCAL STATE</span>
            </div>
            <h1 className="mt-0.5 text-[16px] font-semibold tracking-[-0.02em] text-[#f0f5fb]">Conflict-Free Page Editor</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-lg border border-[#252f43] bg-[#151c2c] px-3 py-2 md:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2be0c3] opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2be0c3]" />
            </span>
            <span className="font-mono text-[11px] text-[#9ba9bd]">protocol connected</span>
          </div>
          <button data-testid="button-toggle-inspector" onClick={() => setShowInspector((value) => !value)} className="flex h-9 items-center gap-2 rounded-lg border border-[#273249] bg-[#151c2c] px-3 text-[12px] font-medium text-[#aebbd0] transition hover:border-[#2be0c3]/50 hover:text-[#e8f5f3]">
            <PanelRight size={15} />
            <span className="hidden sm:inline">Inspector</span>
          </button>
          <button data-testid="button-reset-editor" onClick={() => { setNodes(seedNodes); setEvents(seedEvents); setSelectedId('hero'); setSimStatus('Ready to simulate'); }} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#273249] bg-[#151c2c] text-[#8292ab] transition hover:border-[#f8b84e]/50 hover:text-[#f8b84e]" aria-label="Reset editor">
            <RefreshCcw size={15} />
          </button>
        </div>
      </header>

      <div className={`grid min-h-[calc(100dvh-68px)] ${showInspector ? 'xl:grid-cols-[246px_minmax(430px,1fr)_330px]' : 'xl:grid-cols-[246px_minmax(430px,1fr)]'} lg:grid-cols-[220px_minmax(430px,1fr)]`}>
        <aside className="border-b border-[#202a3c] bg-[#111725] px-4 py-5 lg:border-r lg:border-b-0">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#a7b5ca]">
              <SlidersHorizontal size={14} />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em]">DOM tree</span>
            </div>
            <span className="rounded bg-[#1c2638] px-1.5 py-0.5 font-mono text-[10px] text-[#72819b]">{nodes.length}</span>
          </div>
          <button data-testid="button-add-node" onClick={addNode} className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#35445c] bg-[#151c2c] py-2.5 text-[12px] font-semibold text-[#b8c4d5] transition hover:border-[#2be0c3]/70 hover:bg-[#153b3a]/50 hover:text-[#2be0c3]">
            <Plus size={15} />
            Add page node
          </button>
          <div className="space-y-1.5">
            {nodes.map((node) => {
              const lockOwner = collaborators.find((person) => person.id === node.lockedBy);
              const isSelected = node.id === selectedId;
              return (
                <button key={node.id} data-testid={`node-${node.id}`} onClick={() => selectNode(node)} className={`group relative flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition ${isSelected ? 'border-[#2be0c3]/70 bg-[#153536] shadow-[inset_3px_0_0_#2be0c3]' : 'border-transparent hover:border-[#29364d] hover:bg-[#151e30]'}`}>
                  <GripVertical size={13} className="mt-1 shrink-0 text-[#45546c] opacity-0 transition group-hover:opacity-100" />
                  <span className={`mt-0.5 flex h-6 min-w-6 items-center justify-center rounded font-mono text-[9px] font-medium ${typeTone[node.type]}`}>{node.type === 'PAGE' ? 'PG' : node.type.slice(0, 2)}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[12px] font-medium ${isSelected ? 'text-[#dff8f3]' : 'text-[#bbc6d7]'}`}>{node.label}</span>
                    <span className="mt-1 block truncate font-mono text-[10px] text-[#6e7e99]">&lt;{node.type.toLowerCase()} /&gt;</span>
                  </span>
                  {lockOwner && <Lock size={12} className="mt-1 shrink-0" style={{ color: lockOwner.accent }} />}
                </button>
              );
            })}
          </div>
          <div className="mt-8 border-t border-[#202a3c] pt-4">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#65748d]">Workspace notes</p>
            <div className="rounded-lg border border-[#253049] bg-[#151c2c] p-3">
              <div className="mb-2 flex items-center gap-2 text-[#f8b84e]"><ShieldCheck size={14} /><span className="text-[11px] font-semibold">Lock-aware editing</span></div>
              <p className="text-[11px] leading-5 text-[#8493aa]">Writes are deterministic. A lease makes the protocol legible before it makes the UI collaborative.</p>
            </div>
          </div>
        </aside>

        <section className="grid-surface min-w-0 border-b border-[#202a3c] bg-[#111624] p-4 md:p-7 lg:border-r lg:border-b-0">
          <div className="mx-auto flex w-full max-w-[800px] flex-col">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#65748d]"><span className="text-[#2be0c3]">01</span><ArrowRight size={11} /><span>Live canvas</span></div>
                <h2 className="text-[27px] font-semibold tracking-[-0.045em] text-[#f0f5fb] md:text-[32px]">Editable surface</h2>
                <p className="mt-1 text-[13px] text-[#8291a9]">Select a node, acquire its lease, then write without surprises.</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-[#28354c] bg-[#151c2c] p-1">
                {collaborators.map((collaborator) => (
                  <button key={collaborator.id} data-testid={`button-collaborator-${collaborator.id}`} onClick={() => setActiveCollaborator(collaborator.id)} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] transition ${activeCollaborator === collaborator.id ? 'bg-[#253448] text-[#e7f5f3]' : 'text-[#71819a] hover:text-[#c7d4e5]'}`}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full font-mono text-[9px] font-bold" style={{ backgroundColor: `${collaborator.accent}22`, color: collaborator.accent }}>{collaborator.initials}</span>
                    {collaborator.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-[#2b3b56] bg-[#1a2233] shadow-[0_24px_80px_rgba(0,0,0,.22)]">
              <div className="flex items-center justify-between border-b border-[#2c3b54] bg-[#202b40] px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-[#f06472]" /><span className="h-2 w-2 rounded-full bg-[#f8b84e]" /><span className="h-2 w-2 rounded-full bg-[#2be0c3]" /></div>
                  <span className="ml-2 font-mono text-[10px] text-[#8f9fb7]">sandbox.local / preview</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#74849f]"><CircleDot size={11} className="text-[#2be0c3]" /> DOM SYNCED</div>
              </div>
              <div className="min-h-[445px] bg-[#f3f0e8] p-6 text-[#1c2731] sm:p-10">
                <div className="mx-auto max-w-[580px]">
                  <div className="mb-10 flex items-center justify-between border-b border-[#d8d5cc] pb-4">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#2b5553]"><span className="h-2 w-2 rounded-full bg-[#2be0c3]" /> CFP / 001</div>
                    <div className="flex items-center gap-4 text-[11px] text-[#718078]"><span>Protocol</span><span>Nodes</span></div>
                  </div>
                  <div className={`relative rounded-xl border-2 p-5 transition duration-300 ${selectedId === 'hero' ? 'border-[#2ab6a2] bg-[#edf9f5] shadow-[0_0_0_4px_rgba(43,224,195,.13)]' : 'border-transparent'}`}>
                    <span className="absolute -top-3 left-4 rounded bg-[#1a7770] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[#e8fffb]">h1 · selected</span>
                    <h3 className="max-w-[450px] text-[clamp(32px,5vw,58px)] font-semibold leading-[.98] tracking-[-0.075em] text-[#20343a]">{nodes.find((node) => node.id === 'hero')?.content}</h3>
                    <p className="mt-5 max-w-[390px] text-[14px] leading-6 text-[#657774]">A living canvas where the mechanics of collaboration stay in frame.</p>
                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <button data-testid="button-inspect-node" onClick={() => setSelectedId('hero')} className="rounded-lg bg-[#203f48] px-4 py-2.5 text-[12px] font-semibold text-[#eafff9] transition hover:-translate-y-0.5 hover:bg-[#1e5558]">Inspect a node</button>
                      <span className="font-mono text-[10px] text-[#80908b]">revision 14 / lease: you</span>
                    </div>
                  </div>
                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-[#dad8ce] bg-[#ebe8df] p-4"><span className="font-mono text-[10px] uppercase text-[#83918b]">Active nodes</span><strong className="mt-2 block text-2xl tracking-[-.05em] text-[#2c3d43]">{nodes.length}</strong></div>
                    <div className="rounded-lg border border-[#dad8ce] bg-[#ebe8df] p-4"><span className="font-mono text-[10px] uppercase text-[#83918b]">Held leases</span><strong className="mt-2 block text-2xl tracking-[-.05em] text-[#2c3d43]">{activeLocks.length}</strong></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[#2c3b54] bg-[#171f30] px-4 py-2.5">
                <span className="font-mono text-[10px] text-[#72829c]">rendered locally · no server connection</span>
                <span className="font-mono text-[10px] text-[#2be0c3]">60 FPS</span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="rounded-xl border border-[#27354c] bg-[#151c2c] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2"><MousePointer2 size={14} className="text-[#2be0c3]" /><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8493aa]">Focused node</span></div>
                  <span className="rounded bg-[#183c3a] px-2 py-1 font-mono text-[10px] text-[#2be0c3]">{selectedNode.type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input data-testid="input-node-label" value={selectedNode.label} onChange={(event) => setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, label: event.target.value } : node))} className="min-w-0 flex-1 border-b border-[#34445d] bg-transparent pb-1 text-[14px] font-semibold text-[#e4edf8] outline-none transition focus:border-[#2be0c3]" />
                  <button data-testid="button-toggle-lock" onClick={() => toggleLock(selectedNode)} className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-medium transition ${selectedNode.lockedBy === activeCollaborator ? 'border-[#2be0c3]/60 bg-[#153b3a] text-[#2be0c3]' : selectedNode.lockedBy ? 'border-[#f8b84e]/40 bg-[#3a2e18] text-[#f8b84e]' : 'border-[#34445d] bg-[#1a2233] text-[#9ba9bd] hover:border-[#2be0c3]/60 hover:text-[#2be0c3]'}`}>
                    {selectedNode.lockedBy === activeCollaborator ? <Lock size={14} /> : selectedNode.lockedBy ? <Lock size={14} /> : <Unlock size={14} />}
                    {selectedNode.lockedBy === activeCollaborator ? 'Unlock' : selectedNode.lockedBy ? 'Locked' : 'Lock node'}
                  </button>
                </div>
                <textarea data-testid="input-node-content" value={selectedNode.content} onChange={(event) => updateContent(event.target.value)} onBlur={commitContent} disabled={Boolean(selectedNode.lockedBy && selectedNode.lockedBy !== activeCollaborator)} rows={3} className="mt-4 w-full resize-none rounded-lg border border-[#2a3850] bg-[#101725] p-3 text-[13px] leading-5 text-[#cbd7e6] outline-none transition placeholder:text-[#5e6e87] focus:border-[#2be0c3]/70 disabled:cursor-not-allowed disabled:opacity-50" />
                <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-[#65748d]"><span>{selectedNode.lockedBy ? `lease: ${collaborators.find((person) => person.id === selectedNode.lockedBy)?.name}` : 'unlocked · edits can race'}</span><span>edited by {collaborators.find((person) => person.id === selectedNode.lastEditedBy)?.name}</span></div>
              </div>
              <button data-testid="button-run-simulation" onClick={runSimulation} disabled={isSimulating} className={`group flex min-h-[100px] min-w-[180px] flex-col justify-between rounded-xl border p-4 text-left transition ${isSimulating ? 'border-[#f8b84e]/60 bg-[#3a2e18]' : recentlyResolved ? 'border-[#2be0c3]/50 bg-[#153b3a] hover:border-[#2be0c3]' : 'border-[#2be0c3]/50 bg-[#12302f] hover:-translate-y-0.5 hover:bg-[#16433f]'}`}>
                <div className="flex items-center justify-between"><Zap size={17} className={isSimulating ? 'text-[#f8b84e]' : 'text-[#2be0c3]'} /><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8fa3b7]">simulator</span></div>
                <span className="flex items-center gap-2 text-[12px] font-semibold text-[#dcf7f1]">{isSimulating ? 'Running protocol' : recentlyResolved ? 'Run again' : 'Race two edits'} <ArrowRight size={13} className="transition group-hover:translate-x-1" /></span>
              </button>
            </div>
          </div>
        </section>

        {showInspector && <aside className="bg-[#111725] p-4 md:p-5">
          <div className="mb-5 flex items-center justify-between">
            <div><div className="mb-1 flex items-center gap-2"><Activity size={14} className="text-[#2be0c3]" /><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8493aa]">Activity stream</span></div><p className="text-[12px] text-[#5f708c]">Every write leaves a trace.</p></div>
            <span className={`h-2 w-2 rounded-full ${isSimulating ? 'animate-pulse bg-[#f8b84e]' : 'bg-[#2be0c3]'}`} />
          </div>
          {isSimulating && <div className="mb-4 overflow-hidden rounded-lg border border-[#77552a] bg-[#302617] p-3"><div className="mb-2 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-wider text-[#f8b84e]">Protocol state</span><span className="text-[10px] text-[#c39d5e]">LIVE</span></div><p className="text-[12px] text-[#e8cf9f]">{simStatus}</p><div className="mt-3 h-1 overflow-hidden rounded bg-[#604822]"><div className="animate-pulse-line h-full w-full bg-[#f8b84e]" /></div></div>}
          <div className="space-y-0">
            {visibleEvents.map((event, index) => (
              <div key={event.id} data-testid={`activity-event-${event.id}`} className="animate-slide-in relative flex gap-3 border-l border-[#29354b] pb-5 pl-5" style={{ animationDelay: `${index * 35}ms` }}>
                <span className={`absolute -left-[5px] top-0 h-[9px] w-[9px] rounded-full border-2 border-[#111725] ${event.outcome === 'resolved' ? 'bg-[#2be0c3] shadow-[0_0_0_3px_rgba(43,224,195,.12)]' : event.outcome === 'blocked' ? 'bg-[#f8b84e]' : 'bg-[#70829c]'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2"><p className="text-[12px] font-semibold text-[#cfd9e7]">{event.action} <span className="font-normal text-[#8a9ab2]">{event.target}</span></p><time className="font-mono text-[9px] text-[#62718a]">{event.timestamp}</time></div>
                  <p className="mt-1 text-[11px] leading-4 text-[#71819a]"><span className="text-[#9eabc0]">{event.actor}</span> · {event.detail}</p>
                  <span className={`mt-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${event.outcome === 'resolved' ? 'bg-[#173d3a] text-[#2be0c3]' : event.outcome === 'blocked' ? 'bg-[#3a2d18] text-[#f8b84e]' : event.outcome === 'observed' ? 'bg-[#202c40] text-[#8da0bd]' : 'bg-[#20283a] text-[#99abc5]'}`}>{event.outcome === 'resolved' && <Check size={10} />}{event.outcome}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 rounded-xl border border-[#253049] bg-[#151c2c] p-4">
            <div className="mb-3 flex items-center gap-2"><UsersRound size={14} className="text-[#bca6ff]" /><span className="font-mono text-[10px] uppercase tracking-[0.17em] text-[#8594aa]">Collaborators</span></div>
            <div className="space-y-3">
              {collaborators.map((collaborator) => <div key={collaborator.id} className="flex items-center gap-2.5"><span className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-[10px] font-semibold" style={{ backgroundColor: `${collaborator.accent}1f`, color: collaborator.accent }}>{collaborator.initials}</span><span className="flex-1 text-[12px] text-[#c3cfdf]">{collaborator.name}</span><span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-[#73839c]"><span className="h-1.5 w-1.5 rounded-full" style={{ background: collaborator.status === 'editing' ? collaborator.accent : '#65748d' }} />{collaborator.status}</span></div>)}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-[#5e6f88]"><Terminal size={12} /> deterministic event log · {events.length} records</div>
        </aside>}
      </div>
    </main>
  );
}

export default Editor;