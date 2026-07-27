"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Check, Gift, Users, Coins, ArrowLeft, Loader2 } from "lucide-react";

export default function ReferralsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/referrals")
      .then((res) => res.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const link =
    data && typeof window !== "undefined"
      ? `${window.location.origin}/signup?ref=${data.code}`
      : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permissions can be denied — the link is still shown for manual copy.
    }
  };

  return (
    <div className="min-h-screen bg-ink px-4 py-8 text-paper sm:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-mist hover:text-paper">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div>
          <h1 className="font-display text-2xl font-semibold text-paper">Refer & earn</h1>
          <p className="mt-1.5 text-sm text-mist">
            Invite friends to MultiMind — you both get bonus credits when they sign up.
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {!data && !error && (
          <div className="flex items-center gap-2 text-mist">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}

        {data && (
          <>
            <div className="rounded-2xl border border-line bg-surface p-6">
              <p className="mb-2 text-sm text-mist">Your referral link</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={link}
                  className="w-full flex-1 truncate rounded-lg border border-line bg-surface2 px-3 py-2.5 font-mono text-sm text-paper"
                />
                <button
                  onClick={copyLink}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-signal px-3.5 py-2.5 text-sm font-semibold text-ink transition hover:opacity-90"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-3 text-xs text-mist/70">
                When a friend signs up with your link, you both get{" "}
                <span className="text-signal">{data.bonusCredits} bonus credits</span>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-line bg-surface p-5">
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-signal/10 text-signal">
                  <Users className="h-4.5 w-4.5" />
                </span>
                <p className="font-display text-2xl font-semibold text-paper">
                  {data.referralCount}
                </p>
                <p className="mt-1 text-xs text-mist">Friends invited</p>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-5">
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-signal/10 text-signal">
                  <Coins className="h-4.5 w-4.5" />
                </span>
                <p className="font-display text-2xl font-semibold text-paper">
                  {data.referralCreditsEarned}
                </p>
                <p className="mt-1 text-xs text-mist">Credits earned</p>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-paper">
                <Gift className="h-4 w-4 text-signal" />
                People you've referred
              </h2>
              {data.referredUsers.length === 0 ? (
                <p className="text-sm text-mist">
                  No signups yet — share your link above to start earning credits.
                </p>
              ) : (
                <ul className="divide-y divide-line/60">
                  {data.referredUsers.map((u) => (
                    <li key={u._id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="text-paper">{u.name}</p>
                        <p className="text-xs text-mist">{u.email}</p>
                      </div>
                      <span className="text-xs text-mist">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}