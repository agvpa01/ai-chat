import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import {
  clearPendingCustomerConnectRequest,
  type CustomerAuthMode,
  type CustomerAuthSession,
  writePendingCustomerConnectRequest,
} from "../lib/customer-auth";
import { convexHttpClient } from "../lib/convex-http";

type CustomerAuthCardProps = {
  initialMode: CustomerAuthMode;
  session: CustomerAuthSession | null;
  onLogout: () => void;
  showAccountLink?: boolean;
};

type ConnectState =
  | {
      status: "idle";
      message: string;
    }
  | {
      status: "loading";
      message: string;
    }
  | {
      status: "success";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

const defaultState: ConnectState = {
  status: "idle",
  message: "Shopify will handle authentication on its side, then send the customer back connected.",
};

export function CustomerAuthCard({
  initialMode,
  session,
  onLogout,
  showAccountLink = true,
}: CustomerAuthCardProps) {
  const [connectState, setConnectState] = useState<ConnectState>(defaultState);
  const [isConnecting, setIsConnecting] = useState(false);

  async function connectAccount() {
    if (typeof window === "undefined" || isConnecting) {
      return;
    }

    setIsConnecting(true);
    setConnectState({
      status: "loading",
      message: "Preparing a secure Shopify connection...",
    });

    try {
      const redirectUri = `${window.location.origin}/account/callback`;
      const state = generateRandomToken(24);
      const nonce = generateRandomToken(24);
      const codeVerifier = generateRandomToken(64);
      const codeChallenge = await createCodeChallenge(codeVerifier);

      writePendingCustomerConnectRequest({
        state,
        nonce,
        codeVerifier,
        redirectUri,
        returnPath: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      });

      const result = await beginCustomerConnection({
        redirectUri,
        state,
        nonce,
        codeChallenge,
      });

      window.location.assign(result.authorizationUrl);
    } catch (error) {
      clearPendingCustomerConnectRequest();
      setConnectState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Shopify connection is not ready right now.",
      });
      setIsConnecting(false);
    }
  }

  return (
    <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-[#1D1D1D]/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(231,240,232,0.92))] shadow-[0_18px_50px_rgba(23,58,64,0.08)]">
      <div className="border-b border-[#1D1D1D]/10 bg-[linear-gradient(135deg,rgba(79,184,178,0.18),rgba(59,117,57,0.12))] px-5 py-4">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[#2F6A4A]">
          Customer Connection
        </p>
        <h2 className="mt-2 mb-0 font-['Fraunces'] text-[1.45rem] text-[#173A40]">
          {session ? "Your Shopify account is connected" : "Connect your Shopify account"}
        </h2>
        <p className="mt-2 mb-0 max-w-2xl text-sm leading-6 text-[#173A40]/72">
          {session
            ? "This device is now linked to the customer account we received from Shopify."
            : initialMode === "register"
              ? "Customers will go through Shopify’s hosted account flow instead of creating credentials directly inside the app."
              : "Customers will authenticate through Shopify’s hosted account flow instead of typing their credentials directly into the app."}
        </p>
      </div>

      <div className="p-5">
        {session ? (
          <div className="space-y-5">
            <div className="rounded-[1.35rem] border border-[#3B7539]/18 bg-white/85 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="m-0 text-sm font-semibold text-[#173A40]">
                    {session.customer.displayName}
                  </p>
                  <p className="mt-1 mb-0 text-sm text-[#173A40]/70">{session.customer.email}</p>
                  <p className="mt-2 mb-0 text-xs uppercase tracking-[0.14em] text-[#2F6A4A]/80">
                    Connected until {new Date(session.expiresAt).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full bg-[#EAF3E8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#20442E]">
                  Already connected
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled
                className="rounded-full bg-[#173A40]/78 px-5 py-3 text-sm font-semibold text-white opacity-80"
              >
                Already connected
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full border border-[#173A40]/12 bg-[#F6F7F2] px-4 py-3 text-sm font-semibold text-[#173A40] transition hover:border-[#173A40]/24 hover:bg-white"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-[1.35rem] border border-[#173A40]/10 bg-white/88 p-4">
              <p className="m-0 text-sm leading-7 text-[#173A40]/74">
                Tap once to continue with Shopify. If the customer already has an account there,
                they can sign in. If not, Shopify can guide them through account creation in the
                hosted flow.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => void connectAccount()}
                className="rounded-full bg-[#173A40] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#214a51] disabled:cursor-wait disabled:opacity-70"
              >
                {isConnecting ? "Connecting..." : "Connect Shopify Account"}
              </button>
              {showAccountLink ? (
                <Link
                  to="/account"
                  className="text-sm font-semibold text-[#2F6A4A] no-underline transition hover:text-[#173A40]"
                >
                  Open full account page
                </Link>
              ) : null}
            </div>

            <StatusNotice state={connectState} />
          </div>
        )}
      </div>
    </section>
  );
}

async function beginCustomerConnection(args: {
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}) {
  return convexHttpClient.action(api.customerConnect.beginConnection, args);
}

function StatusNotice({ state }: { state: ConnectState }) {
  if (state.status === "idle") {
    return <p className="m-0 text-sm text-[#173A40]/64">{state.message}</p>;
  }

  const tone =
    state.status === "success"
      ? "bg-[#EAF3E8] text-[#20442E]"
      : state.status === "error"
        ? "bg-[#FFF2F0] text-[#8B3125]"
        : "bg-[#EEF7FA] text-[#1E5965]";

  return <div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${tone}`}>{state.message}</div>;
}

function generateRandomToken(length: number) {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function createCodeChallenge(codeVerifier: string) {
  const encoded = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array) {
  const value = btoa(String.fromCharCode(...bytes));
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
