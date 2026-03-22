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
    <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-[#173A40]/10 bg-[linear-gradient(145deg,#F8FAF5_0%,#EEF5EE_100%)] shadow-[0_18px_50px_rgba(23,58,64,0.08)]">
      <div className="border-b border-[#173A40]/10 bg-[linear-gradient(145deg,rgba(59,117,57,0.12),rgba(34,184,169,0.08))] px-5 py-4">
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
            <div className="rounded-[1.35rem] border border-[#3B7539]/16 bg-white p-4 shadow-[0_10px_28px_rgba(23,58,64,0.04)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="m-0 text-sm font-semibold text-[#173A40]">
                    {session.customer.displayName}
                  </p>
                  <p className="mt-1 mb-0 text-sm text-[#173A40]/70">{session.customer.email}</p>
                  <p className="mt-2 mb-0 text-xs uppercase tracking-[0.14em] text-[#2F6A4A]/80">
                    {session.refreshToken
                      ? "Auto-refresh enabled on this device"
                      : `Connected until ${new Date(session.expiresAt).toLocaleString()}`}
                  </p>
                </div>
                <span className="rounded-full bg-[#EAF3E8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#2F6A4A]">
                  Already connected
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled
                className="rounded-full bg-[#3B7539] px-5 py-3 text-sm font-semibold text-white opacity-85"
              >
                Already connected
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full border border-[#173A40]/12 bg-white px-4 py-3 text-sm font-semibold text-[#173A40] transition hover:border-[#173A40]/22 hover:bg-[#F8FAF5]"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-[1.35rem] border border-[#173A40]/10 bg-white p-4 shadow-[0_10px_28px_rgba(23,58,64,0.04)]">
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
                className="rounded-full bg-[#3B7539] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#336833] disabled:cursor-wait disabled:opacity-70"
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
      ? "border-[#3B7539]/18 bg-[#EAF3E8] text-[#2F6A4A]"
      : state.status === "error"
        ? "border-[#D7A399]/20 bg-[#FFF3F1] text-[#8B3125]"
        : "border-[#3B7539]/14 bg-[#F2F8F1] text-[#2F6A4A]";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${tone}`}>{state.message}</div>
  );
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
