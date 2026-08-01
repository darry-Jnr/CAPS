"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SessionIcon, ArrowUpRightIcon, TrashIcon } from "@/components/icons";

interface StatsSnapshot {
  docsUploaded: number;
  chunksStored: number;
  questionsAsked: number;
  tokensWithout: number;
  tokensWith: number;
  savedTokens: number;
  savedPercent: number;
  costWithoutUsd: number;
  costWithUsd: number;
  costSavedUsd: number;
  latencyWithoutMs: { avg: number; latest: number; count: number };
  latencyWithMs: { avg: number; latest: number; count: number };
  paritokConfigured: boolean;
}

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
const fmtMs = (n: number) => `${Math.round(n).toLocaleString("en-US")}ms`;
const fmtUsd = (n: number) =>
  n >= 0.01 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`;

function Row({ label, value, highlight = false, dim = false }: { label: string; value: string; highlight?: boolean; dim?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 text-[13px] transition-opacity duration-300 ${
        dim ? "opacity-40" : ""
      }`}
    >
      <span className="text-ink-3">{label}</span>
      <span className={`tabular-nums ${highlight ? "font-semibold text-emerald-500" : "font-medium text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-3">{children}</h3>
  );
}

const empty: StatsSnapshot = {
  docsUploaded: 0,
  chunksStored: 0,
  questionsAsked: 0,
  tokensWithout: 0,
  tokensWith: 0,
  savedTokens: 0,
  savedPercent: 0,
  costWithoutUsd: 0,
  costWithUsd: 0,
  costSavedUsd: 0,
  latencyWithoutMs: { avg: 0, latest: 0, count: 0 },
  latencyWithMs: { avg: 0, latest: 0, count: 0 },
  paritokConfigured: false,
};

export default function SessionStats({ paritokOn }: { paritokOn: boolean }) {
  const [stats, setStats] = useState<StatsSnapshot>(empty);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (res.ok && active) setStats((await res.json()) as StatsSnapshot);
      } catch {
        // keep last known stats
      }
    }
    refresh();
    const id = setInterval(refresh, 3000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const hasData = stats.questionsAsked > 0;
  const maxLatency = Math.max(stats.latencyWithoutMs.avg, stats.latencyWithMs.avg, 1);
  const reduction = maxLatency > 0 ? Math.max(0, ((stats.latencyWithoutMs.avg - stats.latencyWithMs.avg) / maxLatency) * 100) : 0;

  async function handleReset() {
    if (!window.confirm("Clear all documents, questions, and savings to start a fresh session?")) return;
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (res.ok) window.location.reload();
    } catch {
      // leave session as-is
    }
  }

  return (
    <div className="flex flex-col">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <SessionIcon className="size-4 text-ink-2" />
        Session
      </h2>

      <div
        className={`mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
          stats.paritokConfigured
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
            : "border-line bg-surface text-ink-3"
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${stats.paritokConfigured ? "bg-emerald-500" : "bg-ink-3"}`}
        />
        {stats.paritokConfigured ? "Paritok: connected" : "Paritok: not configured"}
      </div>

      {!hasData && (
        <p className="mt-4 rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed text-ink-3">
          No questions yet. Ask one with Paritok ON and OFF to see real token and cost savings.
        </p>
      )}

      <div className={`mt-5 flex flex-col gap-1.5 border-t border-line/70 pt-4 ${hasData ? "" : "opacity-40"}`}>
        <SectionLabel>Token Usage</SectionLabel>
        <div className="mt-2 flex flex-col gap-1.5">
          <Row label="Without Paritok" value={`${fmtInt(stats.tokensWithout)} tokens`} />
          <Row label="With Paritok" value={`${fmtInt(stats.tokensWith)} tokens`} dim={!paritokOn} />
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-line/60 pt-2 text-[13px]">
          <span className="font-semibold text-ink">Total Saved</span>
          <span className="text-right">
            <span className="block font-semibold tabular-nums text-emerald-500">
              {fmtInt(stats.savedTokens)} tokens
            </span>
            <span className="block text-[10px] tabular-nums text-ink-3">({stats.savedPercent.toFixed(0)}%)</span>
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 text-[13px]">
          <span className="text-ink-3">Cost Saved</span>
          <span className="tabular-nums font-semibold text-ink">
            {fmtUsd(stats.costSavedUsd)}
          </span>
        </div>
        <Link
          href="/analytics"
          className="mt-3 flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-line-strong hover:bg-surface-hover"
        >
          Analytics
          <ArrowUpRightIcon className="size-3.5 text-ink-3" />
        </Link>
        <button
          type="button"
          onClick={handleReset}
          className="mt-2 flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-red-500/80 transition-colors hover:border-red-500/30 hover:text-red-500"
        >
          Reset session
          <TrashIcon className="size-3.5" />
        </button>
        <Row label="Documents" value={`${stats.docsUploaded} (${fmtInt(stats.chunksStored)} chunks)`} />
      </div>

      <div className={`mt-4 flex flex-col gap-2.5 border-t border-line/70 pt-4 ${hasData ? "" : "opacity-40"}`}>
        <SectionLabel>Latency (avg)</SectionLabel>

        <div className="mt-1">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-ink-3">Without Paritok</span>
            <span className="tabular-nums font-medium text-ink">
              {stats.latencyWithoutMs.count ? fmtMs(stats.latencyWithoutMs.avg) : "—"}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-active">
            <div
              className="h-full rounded-full bg-ink-3/70"
              style={{ width: `${(stats.latencyWithoutMs.avg / maxLatency) * 100}%` }}
            />
          </div>
        </div>

        <div className={`transition-opacity duration-300 ${paritokOn ? "" : "opacity-40"}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-ink-3">With Paritok</span>
            <span className="tabular-nums font-semibold text-ink">
              {stats.latencyWithMs.count ? fmtMs(stats.latencyWithMs.avg) : "—"}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-active">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
              style={{ width: `${(stats.latencyWithMs.avg / maxLatency) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-1 flex flex-col gap-1.5 border-t border-line/60 pt-2.5">
          <Row label="Reduction" value={reduction > 0 ? `${reduction.toFixed(1)}%` : "—"} highlight />
          <Row label="Money Saved" value={fmtUsd(stats.costSavedUsd)} />
        </div>
      </div>
    </div>
  );
}
