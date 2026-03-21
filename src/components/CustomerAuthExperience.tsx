import { Link } from "@tanstack/react-router";
import { CustomerAuthCard } from "./CustomerAuthCard";
import { type CustomerAuthMode, type CustomerAuthSession } from "../lib/customer-auth";

type CustomerAuthExperienceProps = {
  initialMode: CustomerAuthMode;
  session: CustomerAuthSession | null;
  onLogout: () => void;
  variant?: "page" | "response";
};

export function CustomerAuthExperience({
  initialMode,
  session,
  onLogout,
  variant = "page",
}: CustomerAuthExperienceProps) {
  const isResponse = variant === "response";

  return (
    <div className={isResponse ? "mt-5 space-y-6" : "space-y-8"}>
      <section className="relative overflow-hidden rounded-[2.4rem] border border-[#173A40]/10 bg-[linear-gradient(145deg,#F8FAF5_0%,#EEF5EE_52%,#F7FAF6_100%)] p-6 shadow-[0_24px_80px_rgba(23,58,64,0.08)] sm:p-8">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(59,117,57,0.16),transparent_58%),radial-gradient(circle_at_top_right,rgba(34,184,169,0.12),transparent_48%)]" />
        <div className="relative z-10 max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#2F6A4A]">
            {isResponse ? "Account Connection" : "Account"}
          </p>
          <h1 className="m-0 font-['Fraunces'] text-3xl text-[#173A40] sm:text-5xl">
            Connect your Shopify account.
          </h1>
          <p className="mt-4 mb-0 max-w-2xl text-base leading-8 text-[#173A40]/72">
            This Shopify-powered account screen sends customers through Shopify’s hosted account
            flow and connects the returned customer session back to this app on the current device.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold">
            {isResponse ? (
              <Link
                to="/account"
                className="rounded-full border border-[#3B7539]/14 bg-white px-4 py-2 text-[#2F6A4A] no-underline transition hover:border-[#3B7539]/28 hover:bg-[#F8FAF5]"
              >
                Open standalone account page
              </Link>
            ) : (
              <Link
                to="/"
                className="rounded-full border border-[#3B7539]/14 bg-white px-4 py-2 text-[#2F6A4A] no-underline transition hover:border-[#3B7539]/28 hover:bg-[#F8FAF5]"
              >
                Back to assistant
              </Link>
            )}
            <span className="text-[#173A40]/60">
              {session ? `Connected as ${session.customer.email}` : "Not connected yet"}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <div>
          <CustomerAuthCard
            initialMode={initialMode}
            session={session}
            onLogout={onLogout}
            showAccountLink={!isResponse}
          />
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.8rem] border border-[#173A40]/10 bg-white p-5 shadow-[0_12px_36px_rgba(23,58,64,0.06)]">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-[#2F6A4A]">
              What this connects
            </p>
            <h2 className="mt-2 mb-0 text-xl font-semibold text-[#173A40]">
              App-linked customer session
            </h2>
            <p className="mt-3 mb-0 text-sm leading-7 text-[#173A40]/72">
              Once signed in, the app keeps the Shopify customer access token in local storage so we
              can personalize future account-aware experiences on this device.
            </p>
          </div>

          <div className="rounded-[1.8rem] border border-[#173A40]/10 bg-[linear-gradient(160deg,#F4F8F3_0%,#FFFFFF_100%)] p-5 shadow-[0_12px_36px_rgba(23,58,64,0.06)]">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-[#2F6A4A]">
              Next unlocks
            </p>
            <ul className="mt-3 mb-0 space-y-3 pl-5 text-sm leading-7 text-[#173A40]/72">
              <li>Authenticated order lookup in chat</li>
              <li>Saved profile and account-aware support flows</li>
              <li>Protected customer features beyond sign-in</li>
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
}
