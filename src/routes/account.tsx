import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CustomerAuthExperience } from "../components/CustomerAuthExperience";
import {
  clearStoredCustomerSession,
  refreshCustomerSessionIfNeeded,
  readStoredCustomerSession,
  type CustomerAuthSession,
} from "../lib/customer-auth";

export const Route = createFileRoute("/account")({
  component: Account,
});

function Account() {
  const location = useLocation();
  const [customerSession, setCustomerSession] = useState<CustomerAuthSession | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const storedSession = readStoredCustomerSession();
      const refreshedSession = await refreshCustomerSessionIfNeeded(storedSession);

      if (cancelled) {
        return;
      }

      setCustomerSession(refreshedSession);
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const session = customerSession;

    if (!session?.refreshToken) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshCustomerSessionIfNeeded(session).then((refreshedSession) => {
        if (!refreshedSession) {
          setCustomerSession(null);
          return;
        }

        if (
          refreshedSession.accessToken !== session.accessToken ||
          refreshedSession.expiresAt !== session.expiresAt ||
          refreshedSession.refreshToken !== session.refreshToken
        ) {
          setCustomerSession(refreshedSession);
        }
      });
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [customerSession]);

  function handleLogout() {
    setCustomerSession(null);
    clearStoredCustomerSession();
  }

  if (location.pathname === "/account/callback") {
    return <Outlet />;
  }

  return (
    <main className="page-wrap px-4 py-12">
      <CustomerAuthExperience
        initialMode="login"
        session={customerSession}
        onLogout={handleLogout}
      />
    </main>
  );
}
