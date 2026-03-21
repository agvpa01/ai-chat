import { z } from "zod";

export type CustomerAuthMode = "login" | "register";

export type CustomerAuthSession = {
  accessToken: string;
  expiresAt: string;
  idToken?: string;
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string;
  };
};

export type CustomerAuthFieldErrors = Partial<
  Record<"email" | "password" | "firstName" | "lastName" | "general", string>
>;

export type CustomerAuthResponse =
  | {
      ok: true;
      mode: CustomerAuthMode;
      session: CustomerAuthSession;
      message: string;
    }
  | {
      ok: false;
      mode: CustomerAuthMode;
      message: string;
      fieldErrors?: CustomerAuthFieldErrors;
    };

const customerSessionSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.string().min(1),
  customer: z.object({
    id: z.string().min(1),
    email: z.string().email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    displayName: z.string().min(1),
  }),
});

export const CUSTOMER_SESSION_STORAGE_KEY = "vpa-shopify-customer-session-v1";
export const CUSTOMER_CONNECT_PENDING_STORAGE_KEY = "vpa-shopify-customer-connect-v1";

export type PendingCustomerConnectRequest = {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectUri: string;
  returnPath: string;
};

export function getCustomerAuthRequestMode(input: string): CustomerAuthMode | null {
  const lowered = input.toLowerCase();

  if (
    ["register", "sign up", "signup", "create account", "create an account"].some((term) =>
      lowered.includes(term),
    )
  ) {
    return "register";
  }

  if (
    [
      "login",
      "log in",
      "sign in",
      "signin",
      "customer account",
      "my account",
      "account login",
    ].some((term) => lowered.includes(term))
  ) {
    return "login";
  }

  return null;
}

export function getCustomerAuthMessage(mode: CustomerAuthMode) {
  return mode === "register"
    ? "I can help you connect your Shopify customer account here. Use the connect button below to continue through Shopify’s hosted account flow."
    : "You can connect your Shopify customer account here. Use the connect button below and Shopify will handle the sign-in step for us.";
}

export function parseCustomerSession(input: unknown): CustomerAuthSession | null {
  const parsed = customerSessionSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  if (new Date(parsed.data.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return parsed.data;
}

export function readStoredCustomerSession(): CustomerAuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CUSTOMER_SESSION_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const session = parseCustomerSession(JSON.parse(raw));

    if (!session) {
      window.localStorage.removeItem(CUSTOMER_SESSION_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function writeStoredCustomerSession(session: CustomerAuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CUSTOMER_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {}
}

export function clearStoredCustomerSession() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(CUSTOMER_SESSION_STORAGE_KEY);
  } catch {}
}

export function readPendingCustomerConnectRequest(): PendingCustomerConnectRequest | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CUSTOMER_CONNECT_PENDING_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PendingCustomerConnectRequest;

    if (
      typeof parsed?.state !== "string" ||
      typeof parsed?.nonce !== "string" ||
      typeof parsed?.codeVerifier !== "string" ||
      typeof parsed?.redirectUri !== "string" ||
      typeof parsed?.returnPath !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writePendingCustomerConnectRequest(request: PendingCustomerConnectRequest) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CUSTOMER_CONNECT_PENDING_STORAGE_KEY, JSON.stringify(request));
  } catch {}
}

export function clearPendingCustomerConnectRequest() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(CUSTOMER_CONNECT_PENDING_STORAGE_KEY);
  } catch {}
}
