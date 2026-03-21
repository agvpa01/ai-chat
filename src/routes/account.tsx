import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CustomerAuthExperience } from "../components/CustomerAuthExperience";
import {
  clearStoredCustomerSession,
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
    setCustomerSession(readStoredCustomerSession());
  }, []);

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
