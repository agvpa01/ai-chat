import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import {
  clearPendingCustomerConnectRequest,
  clearStoredCustomerSession,
  readPendingCustomerConnectRequest,
  writeStoredCustomerSession,
} from "../lib/customer-auth";
import { convexHttpClient } from "../lib/convex-http";

export const Route = createFileRoute("/account/callback")({
  component: AccountCallback,
});

type CallbackState =
  | { status: "loading"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function AccountCallback() {
  const [state, setState] = useState<CallbackState>({
    status: "loading",
    message: "Connecting your Shopify account...",
  });

  useEffect(() => {
    void finishConnection();
  }, []);

  async function finishConnection() {
    if (typeof window === "undefined") {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const code = currentUrl.searchParams.get("code");
    const returnedState = currentUrl.searchParams.get("state");
    const error = currentUrl.searchParams.get("error");
    const errorDescription = currentUrl.searchParams.get("error_description");
    const pending = readPendingCustomerConnectRequest();

    clearConnectQueryParams(currentUrl);

    if (error) {
      clearPendingCustomerConnectRequest();
      setState({
        status: "error",
        message: errorDescription || error,
      });
      return;
    }

    if (!code || !returnedState || !pending || pending.state !== returnedState) {
      clearPendingCustomerConnectRequest();
      setState({
        status: "error",
        message: "We could not verify the Shopify callback. Please try connecting again.",
      });
      return;
    }

    try {
      const result = await completeCustomerConnection({
        redirectUri: pending.redirectUri,
        code,
        codeVerifier: pending.codeVerifier,
      });

      writeStoredCustomerSession(result.session);
      clearPendingCustomerConnectRequest();
      setState({
        status: "success",
        message: result.message,
      });

      window.setTimeout(() => {
        window.location.replace(pending.returnPath || "/");
      }, 900);
    } catch (callbackError) {
      clearStoredCustomerSession();
      clearPendingCustomerConnectRequest();
      setState({
        status: "error",
        message:
          callbackError instanceof Error
            ? callbackError.message
            : "Shopify could not complete the account connection.",
      });
    }
  }

  const tone =
    state.status === "success"
      ? "bg-[#EAF3E8] text-[#20442E]"
      : state.status === "error"
        ? "bg-[#FFF2F0] text-[#8B3125]"
        : "bg-[#EEF7FA] text-[#1E5965]";

  return (
    <main className="page-wrap flex min-h-[70vh] items-center px-4 py-12">
      <section className="mx-auto w-full max-w-2xl rounded-[2rem] border border-[rgba(23,58,64,0.1)] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(231,243,236,0.92))] p-8 shadow-[0_24px_80px_rgba(23,58,64,0.08)]">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#2F6A4A]">
          Shopify Callback
        </p>
        <h1 className="m-0 font-['Fraunces'] text-3xl text-[#173A40]">
          Finalizing account connection
        </h1>
        <div className={`mt-5 rounded-2xl px-4 py-4 text-sm leading-7 ${tone}`}>
          {state.message}
        </div>
      </section>
    </main>
  );
}

async function completeCustomerConnection(args: {
  redirectUri: string;
  code: string;
  codeVerifier: string;
}) {
  return convexHttpClient.action(api.customerConnect.completeConnection, args);
}

function clearConnectQueryParams(currentUrl: URL) {
  if (typeof window === "undefined") {
    return;
  }

  currentUrl.searchParams.delete("code");
  currentUrl.searchParams.delete("state");
  currentUrl.searchParams.delete("iss");
  currentUrl.searchParams.delete("error");
  currentUrl.searchParams.delete("error_description");
  window.history.replaceState({}, "", currentUrl.toString());
}
