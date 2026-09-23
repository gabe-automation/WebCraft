import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, Show, SignIn, SignUp } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Editor from '@/pages/editor';
import {
  Redirect,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#ef694e',
    colorForeground: '#26232d',
    colorMutedForeground: '#74717a',
    colorBackground: '#f7f1e8',
    colorInput: '#fbf8f2',
    colorInputForeground: '#39343b',
    colorNeutral: '#d8d0c8',
    fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
    borderRadius: '0.75rem',
  },
};

function Landing() {
  const [, setLocation] = useLocation();
  return (
    <main className="wc-landing flex min-h-[100dvh] items-center justify-center px-4 py-6 text-[#f6f1e8] sm:px-8 sm:py-10">
      <section className="wc-landing-card grid w-full max-w-6xl overflow-hidden rounded-[30px] border border-white/10 shadow-[0_30px_100px_rgba(19,24,38,.28)] lg:grid-cols-[1.3fr_.7fr]">
        <div className="wc-landing-hero relative flex min-h-[590px] flex-col justify-between overflow-hidden p-7 sm:p-10 lg:p-14">
          <div className="relative z-10 flex items-center gap-3">
            <img src={`${basePath}/logo.svg`} className="h-10 w-10 rounded-[12px] shadow-[0_8px_22px_rgba(239,105,78,.25)]" alt="" />
            <span className="font-mono text-[11px] uppercase tracking-[.2em] text-[#f4c6af]">WebCraft / studio</span>
          </div>
          <div className="relative z-10 mt-20">
            <div className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-[#f2a58e]"><span className="h-1.5 w-1.5 rounded-full bg-[#ef694e]" /> realtime creative workspace</div>
            <h1 className="max-w-2xl text-[clamp(3.4rem,8vw,7.6rem)] font-semibold leading-[.88] tracking-[-.1em] text-[#fff9f0]">Make the web<br /><em className="font-serif font-normal tracking-[-.07em] text-[#ef8b70]">together.</em></h1>
            <p className="mt-8 max-w-lg text-[14px] leading-7 text-[#c7c1c0] sm:text-[15px]">A visual builder for teams who care about the details. Compose responsive pages, edit authored components, and see every decision land live.</p>
          </div>
          <div className="relative z-10 mt-16 flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-[.12em] text-[#9d9da5]">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Live cursors</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Shared whiteboard</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Conflict aware</span>
          </div>
        </div>
        <div className="wc-landing-aside flex flex-col justify-between p-7 sm:p-10 lg:p-12">
          <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[.16em] text-[#827f89]"><span>Workspace 01</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#72c7a9]" /> secure access</span></div>
          <div className="py-16">
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#ef8b70]">Your canvas awaits</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[.95] tracking-[-.07em] text-[#f8f1e7]">Bring the room<br />into the page.</h2>
            <p className="mt-5 text-[13px] leading-6 text-[#aaa7aa]">Sign in with your real account so your team can recognize you on the canvas.</p>
            <button data-testid="button-sign-in" onClick={() => setLocation('/sign-in')} className="mt-8 flex h-12 w-full items-center justify-center rounded-xl bg-[#ef694e] px-5 text-[12px] font-bold text-[#261f28] transition hover:-translate-y-0.5 hover:bg-[#f2866c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef8b70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#282530]">Continue with Google</button>
            <button data-testid="button-sign-up" onClick={() => setLocation('/sign-up')} className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-[#514b56] bg-[#332e38] px-5 text-[12px] font-semibold text-[#e5e0db] transition hover:border-[#ef8b70] hover:text-[#fff8f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef8b70]">Create an account</button>
            <p className="mt-6 text-center text-[10px] leading-5 text-[#817d85]">Google and email sign-in are managed securely by Clerk.</p>
          </div>
          <div className="flex items-center justify-between border-t border-[#433d49] pt-5 font-mono text-[9px] uppercase tracking-[.14em] text-[#716d76]"><span>Built for small teams</span><span>2026 / v1.0</span></div>
        </div>
      </section>
    </main>
  );
}

function Home() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/editor" /></Show>
      <Show when="signed-out"><Landing /></Show>
    </>
  );
}

function UserPortal({ page = 'builder' }: { page?: 'builder' | 'whiteboard' | 'chat' }) {
  return (
    <>
      <Show when="signed-in"><Editor page={page} /></Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

function ClerkShell() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Welcome to WebCraft', subtitle: 'Sign in to collaborate on your shared site' } },
        signUp: { start: { title: 'Create your WebCraft account', subtitle: 'Start building with your team' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <Router />
    </ClerkProvider>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/editor" component={() => <UserPortal page="builder" />} />
        <Route path="/whiteboard" component={() => <UserPortal page="whiteboard" />} />
        <Route path="/chat" component={() => <UserPortal page="chat" />} />
        <Route path="/sign-in/*?" component={() => <div className="flex min-h-[100dvh] items-center justify-center bg-[#292638] px-4 py-8"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>} />
        <Route path="/sign-up/*?" component={() => <div className="flex min-h-[100dvh] items-center justify-center bg-[#292638] px-4 py-8"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <ClerkShell />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
