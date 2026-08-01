"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnalyticsIcon, ArrowLeftIcon } from "@/components/icons";

interface QuestionRow {
  question: string;
  mode: "on" | "off";
  promptTokens: number;
  baselineTokens: number;
  savedTokens: number;
  savedPercent: number;
  elapsedMs: number;
  askedAt: number;
  docName?: string;
}

interface DocRow {
  name: string;
  chunks: number;
  uploadedAt: number;
  questionsAsked: number;
  tokensSaved: number;
}

interface Stats {
  questionsAsked: number;
  savedTokens: number;
  savedPercent: number;
  costSavedUsd: number;
  latencyWithoutMs: { avg: number; count: number };
  latencyWithMs: { avg: number; count: number };
}

interface AnalyticsData {
  stats: Stats;
  questions: QuestionRow[];
  docs: DocRow[];
}

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
const fmtUsd = (n: number) => (n >= 0.01 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`);
const fmtMs = (n: number) => `${Math.round(n).toLocaleString("en-US")}ms`;
const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-sm text-ink-3">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs font-medium tabular-nums text-emerald-500">{sub}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ModeBadge({ mode }: { mode: "on" | "off" }) {
  return mode === "on" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
      ON
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink-3/10 px-2 py-0.5 text-[10px] font-bold text-ink-3">
      OFF
    </span>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const res = await fetch("/api/analytics", { cache: "no-store" });
        if (res.ok && active) setData((await res.json()) as AnalyticsData);
      } catch {
        // keep last known data
      }
    }
    refresh();
    const id = setInterval(refresh, 3000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const stats = data?.stats;
  const questions = data?.questions ?? [];
  const docs = data?.docs ?? [];

  const onCount = questions.filter((q) => q.mode === "on").length;
  const offCount = questions.filter((q) => q.mode === "off").length;
  const totalQ = onCount + offCount;
  const onPct = totalQ > 0 ? (onCount / totalQ) * 100 : 0;

  const latencyReduction =
    stats && stats.latencyWithoutMs.count > 0 && stats.latencyWithMs.count > 0
      ? Math.max(0, ((stats.latencyWithoutMs.avg - stats.latencyWithMs.avg) / stats.latencyWithoutMs.avg) * 100)
      : null;

  const onQuestions = questions.filter((q) => q.mode === "on");
  const maxBaseline = Math.max(1, ...onQuestions.map((q) => q.baselineTokens));
  const maxLatency = Math.max(1, ...questions.map((q) => q.elapsedMs));

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-3 transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to session
        </Link>

        <header className="mt-4 flex items-center gap-2.5">
          <AnalyticsIcon className="size-5 text-ink-2" />
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Analytics</h1>
        </header>
        <p className="mt-1.5 text-sm text-ink-3">
          Measured Paritok impact across your session — real token, cost, and latency numbers.
        </p>

        {!stats || stats.questionsAsked === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-ink-3">No questions yet.</p>
            <Link
              href="/"
              className="rounded-full bg-[#1a1a1a] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
            >
              Ask a question
            </Link>
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Questions asked" value={fmtInt(stats.questionsAsked)} />
              <KpiCard
                label="Tokens saved"
                value={fmtInt(stats.savedTokens)}
                sub={`${stats.savedPercent.toFixed(0)}% fewer than uncompressed`}
              />
              <KpiCard label="Money saved" value={fmtUsd(stats.costSavedUsd)} />
              <KpiCard
                label="Avg latency reduction"
                value={latencyReduction === null ? "—" : `${latencyReduction.toFixed(0)}%`}
                sub={
                  stats.latencyWithMs.count > 0
                    ? `${fmtMs(stats.latencyWithMs.avg)} with Paritok`
                    : "No Paritok-ON questions yet"
                }
              />
            </div>

            {/* Toggle split */}
            <Card title="Paritok toggle split">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-active">
                <div
                  className="bg-emerald-500 transition-all"
                  style={{ width: `${onPct}%` }}
                />
                <div className="bg-ink-3/50 transition-all" style={{ width: `${100 - onPct}%` }} />
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-ink-3">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  ON — {onCount} question{onCount === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-ink-3/50" />
                  OFF — {offCount} question{offCount === 1 ? "" : "s"}
                </span>
              </div>
            </Card>

            {/* Tokens chart */}
            <Card title="Prompt tokens per question (Paritok ON)">
              {onQuestions.length === 0 ? (
                <p className="text-sm text-ink-3">
                  Ask a question with Paritok ON to compare compressed vs uncompressed tokens.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {onQuestions.map((q, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-xs text-ink-2">{q.question}</span>
                        <span className="shrink-0 text-xs tabular-nums text-ink-3">
                          {fmtInt(q.baselineTokens)} → {fmtInt(q.promptTokens)}{" "}
                          <span className="font-semibold text-emerald-500">
                            ({q.savedPercent.toFixed(0)}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-active">
                        <div
                          className="h-full rounded-full bg-ink-3/70 transition-all"
                          style={{ width: `${(q.baselineTokens / maxBaseline) * 100}%` }}
                        />
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-active">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                          style={{ width: `${(q.promptTokens / maxBaseline) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="mt-1 flex items-center gap-4 text-xs text-ink-3">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-ink-3/70" />
                      Without Paritok
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      With Paritok
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Latency chart */}
            <Card title="Latency per question">
              <div className="flex flex-col gap-3">
                {questions.map((q, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-xs text-ink-2">
                        <span className="truncate">{q.question}</span>
                        <ModeBadge mode={q.mode} />
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-ink-3">{fmtMs(q.elapsedMs)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-active">
                      <div
                        className={`h-full rounded-full transition-all ${
                          q.mode === "on"
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                            : "bg-ink-3/70"
                        }`}
                        style={{ width: `${(q.elapsedMs / maxLatency) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Per-question table */}
            <Card title="Questions">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase tracking-widest text-ink-3">
                      <th className="py-2 pr-4 font-bold">Question</th>
                      <th className="py-2 pr-4 font-bold">Doc</th>
                      <th className="py-2 pr-4 font-bold">Mode</th>
                      <th className="py-2 pr-4 text-right font-bold">Without</th>
                      <th className="py-2 pr-4 text-right font-bold">With</th>
                      <th className="py-2 pr-4 text-right font-bold">Saved</th>
                      <th className="py-2 text-right font-bold">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q, i) => (
                      <tr key={i} className="border-b border-line/60 text-ink-2 last:border-0">
                        <td className="max-w-[220px] truncate py-2.5 pr-4">{q.question}</td>
                        <td className="max-w-[140px] truncate py-2.5 pr-4 text-ink-3">{q.docName ?? "—"}</td>
                        <td className="py-2.5 pr-4">
                          <ModeBadge mode={q.mode} />
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">{fmtInt(q.baselineTokens)}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">{fmtInt(q.promptTokens)}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums font-semibold text-emerald-500">
                          {q.savedTokens > 0 ? `-${fmtInt(q.savedTokens)} (${q.savedPercent.toFixed(0)}%)` : "—"}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{fmtMs(q.elapsedMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Per-document table */}
            {docs.length > 0 && (
              <Card title="Documents">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-[10px] uppercase tracking-widest text-ink-3">
                        <th className="py-2 pr-4 font-bold">Document</th>
                        <th className="py-2 pr-4 font-bold">Uploaded</th>
                        <th className="py-2 pr-4 text-right font-bold">Chunks</th>
                        <th className="py-2 pr-4 text-right font-bold">Questions</th>
                        <th className="py-2 text-right font-bold">Tokens saved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map((d, i) => (
                        <tr key={i} className="border-b border-line/60 text-ink-2 last:border-0">
                          <td className="max-w-[220px] truncate py-2.5 pr-4">{d.name}</td>
                          <td className="py-2.5 pr-4 text-ink-3">{fmtTime(d.uploadedAt)}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">{fmtInt(d.chunks)}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">{fmtInt(d.questionsAsked)}</td>
                          <td className="py-2.5 text-right tabular-nums font-semibold text-emerald-500">
                            {fmtInt(d.tokensSaved)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}
