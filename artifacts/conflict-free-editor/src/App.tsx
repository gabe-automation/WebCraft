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
    colorPrimary: '#177461',
    colorForeground: '#24363a',
    colorMutedForeground: '#71838a',
    colorBackground: '#fffdfa',
    colorInput: '#f8fafb',
    colorInputForeground: '#33484e',
    colorNeutral: '#d5e0e2',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    borderRadius: '0.8rem',
  },
};

function Landing() {
  const [, setLocation] = useLocation();
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#e7edf2] px-6 py-12 text-[#24363a]">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#cbd8dc] bg-[#fffdfa] shadow-[0_24px_80px_rgba(43,59,68,.14)] md:grid-cols-[1.1fr_.9fr]">
        <div className="bg-[#173e3b] p-8 text-[#effaf6] md:p-12">
          <div className="mb-16 flex items-center gap-3"><img src={`${basePath}/logo.svg`} className="h-10 w-10 rounded-xl" alt="" /><span className="font-mono text-[11px] uppercase tracking-[.18em] text-[#c6eee5]">northstar studio</span></div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#9ad0c2]">Realtime page builder</p>
          <h1 className="mt-4 max-w-md text-5xl font-bold tracking-[-.08em] md:text-7xl">Shape the story together.</h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-[#b9d9d1]">A conflict-aware visual workspace where real collaborators can move blocks, edit content, and see each other’s cursors live.</p>
        </div>
        <div className="flex flex-col justify-center p-8 md:p-12">
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#819099]">Your workspace awaits</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-.06em]">Sign in to collaborate.</h2>
          <p className="mt-3 text-sm leading-6 text-[#71838a]">Use your real account so teammates can recognize your presence on the canvas.</p>
          <button onClick={() => setLocation('/sign-in')} className="mt-8 flex h-12 items-center justify-center rounded-xl bg-[#e1844c] px-5 text-sm font-bold text-[#2b1d18] transition hover:-translate-y-0.5 hover:bg-[#ee9661]">Continue with Google</button>
          <button onClick={() => setLocation('/sign-up')} className="mt-3 flex h-11 items-center justify-center rounded-xl border border-[#d5e0e2] bg-white px-5 text-sm font-semibold text-[#52656c] transition hover:border-[#91c5b7] hover:text-[#177461]">Create an account</button>
          <p className="mt-6 text-center text-[10px] leading-5 text-[#9aa7aa]">Google and email sign-in are managed securely by Clerk.</p>
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

function UserPortal() {
  return (
    <>
      <Show when="signed-in"><Editor /></Show>
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
        signIn: { start: { title: 'Welcome to Northstar', subtitle: 'Sign in to collaborate on your shared site' } },
        signUp: { start: { title: 'Create your Northstar account', subtitle: 'Start building with your team' } },
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
        <Route path="/editor" component={UserPortal} />
        <Route path="/sign-in/*?" component={() => <div className="flex min-h-[100dvh] items-center justify-center bg-[#e7edf2] px-4"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>} />
        <Route path="/sign-up/*?" component={() => <div className="flex min-h-[100dvh] items-center justify-center bg-[#e7edf2] px-4"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>} />
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
