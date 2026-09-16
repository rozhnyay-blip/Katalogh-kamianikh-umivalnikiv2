import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { skSK } from "@clerk/localizations";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { HomePage } from "./pages/HomePage";
import { AdminPage } from "./pages/AdminPage";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(177 33% 30%)",
    colorForeground: "hsl(194 29% 18%)",
    colorMutedForeground: "hsl(193 13% 40%)",
    colorDanger: "hsl(6 55% 42%)",
    colorBackground: "hsl(39 40% 96%)",
    colorInput: "hsl(38 35% 93%)",
    colorInputForeground: "hsl(194 29% 18%)",
    colorNeutral: "hsl(193 17% 78%)",
    fontFamily: "'Manrope', sans-serif",
    borderRadius: "1rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#f5f2e8] rounded-2xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#192b2e]",
    headerSubtitle: "text-[#586b6a]",
    socialButtonsBlockButtonText: "text-[#192b2e]",
    formFieldLabel: "text-[#192b2e]",
    footerActionLink: "text-[#2e4d4a]",
    footerActionText: "text-[#586b6a]",
    dividerText: "text-[#586b6a]",
    identityPreviewEditButton: "text-[#2e4d4a]",
    formFieldSuccessText: "text-[#2e4d4a]",
    alertText: "text-[#d93a3a]",
    logoBox: "mb-6",
    logoImage: "h-12 object-contain",
    socialButtonsBlockButton: "border border-[#b8c2c1]",
    formButtonPrimary: "bg-[#335655] hover:bg-[#233a38] text-[#f2eedf] min-h-[44px]",
    formFieldInput: "border-[#b8c2c1] bg-transparent text-[#192b2e] min-h-[44px]",
    footerAction: "",
    dividerLine: "bg-[#b8c2c1]",
    alert: "border-[#d93a3a] bg-[#fdf0f0]",
    otpCodeFieldInput: "border-[#b8c2c1] bg-transparent min-h-[44px]",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f0e9d5] px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/admin`} forceRedirectUrl={`${basePath}/admin`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f0e9d5] px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/admin`} forceRedirectUrl={`${basePath}/admin`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={skSK}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
