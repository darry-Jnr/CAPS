"use client";

import { useState } from "react";
import Composer from "@/components/composer";
import SessionStats from "@/components/session-stats";
import StudyPanel from "@/components/study-panel";
import { SparklesIcon, XIcon, FileTextIcon } from "@/components/icons";
import type { StudyContent } from "@/lib/study";

interface Message {
  role: "user" | "ai";
  content: string;
  error?: boolean;
}

interface ChatResponse {
  reply: string;
  mode: "on" | "off";
  elapsedMs: number;
  fallbackReason?: string;
  compression?: { originalTokens: number; compressedTokens: number };
  study?: StudyContent;
}

export default function ChatHome() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [docId, setDocId] = useState<string>();
  const [docName, setDocName] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paritokOn, setParitokOn] = useState(true);
  const [study, setStudy] = useState<StudyContent | null>(null);
  const [isPaneOpen, setIsPaneOpen] = useState(false);

  async function handleUploadFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await res.json()) as { docId?: string; name?: string; error?: string };
      if (!res.ok || !data.docId) {
        setMessages((prev) => [...prev, { role: "ai", content: `Upload failed: ${data.error ?? "unknown error"}`, error: true }]);
        return;
      }
      setDocId(data.docId);
      setDocName(data.name);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "ai", content: `Upload error: ${error instanceof Error ? error.message : "network error"}`, error: true }]);
    } finally {
      setUploading(false);
    }
  }

  async function handleSend(text: string, paritokOn: boolean) {
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
          docId,
          paritokOn,
        }),
      });
      const data = (await res.json()) as ChatResponse & { error?: string };
      if (!res.ok || data.error) {
        setMessages((prev) => [...prev, { role: "ai", content: data.error ?? "Something went wrong.", error: true }]);
        return;
      }
      setMessages((prev) => [...prev, { role: "ai", content: data.reply }]);
      if (data.study) {
        setStudy(data.study);
        setIsPaneOpen(true);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "ai", content: `Network error: ${error instanceof Error ? error.message : "unknown"}`, error: true }]);
    } finally {
      setLoading(false);
    }
  }

  function clearDoc() {
    setDocId(undefined);
    setDocName(undefined);
  }

  function closeStudyPane() {
    setIsPaneOpen(false);
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden bg-surface">
      {/* Chat column */}
      <div className="flex flex-1 flex-col min-w-0 h-full justify-between">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-6">
            <div className="size-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-2">
              <SparklesIcon className="size-6 animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-ink">Ask CAPS</h1>
            <p className="text-sm text-ink-3 max-w-sm leading-relaxed">
              Upload a PDF, Word document, or text file, then ask questions about
              it. Toggle Paritok ON and OFF to see the live token savings in the
              Session panel.
            </p>
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto px-6 py-8">
            <div className="max-w-2xl mx-auto w-full flex flex-col gap-8">
              {messages.map((msg, idx) => (
                <div key={idx} className="flex flex-col gap-2 items-start">
                  <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">
                    {msg.role === "user" ? "You" : "CAPS"}
                  </span>
                  <div
                    className={`text-base leading-relaxed whitespace-pre-wrap ${
                      msg.error ? "text-red-500" : "text-ink-2"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-ink-3">
                  <span className="size-2 animate-pulse rounded-full bg-ink-3" />
                  <span className="text-xs font-medium">CAPS is thinking…</span>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Uploaded doc chip */}
        {uploading ? (
          <div className="mx-auto w-full max-w-[768px] px-4 pb-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2">
              <FileTextIcon className="size-3.5 animate-pulse text-accent" />
              <span className="text-ink-3">Uploading…</span>
            </div>
          </div>
        ) : docName ? (
          <div className="mx-auto w-full max-w-[768px] px-4 pb-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2">
              <FileTextIcon className="size-3.5 text-accent" />
              <span className="max-w-[240px] truncate">{docName}</span>
              <button
                type="button"
                onClick={clearDoc}
                aria-label="Remove document"
                className="text-ink-3 hover:text-ink"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
          </div>
        ) : null}

        {/* Composer container */}
        <div className="pb-4 pt-2 shrink-0 bg-surface">
          <Composer
            onSend={handleSend}
            onUploadFile={handleUploadFile}
            disabled={loading || uploading}
            paritokOn={paritokOn}
            onToggleParitok={setParitokOn}
          />
        </div>
      </div>

      {/* Middle pane: study content (summary / quiz / concepts) */}
      <div
        className={`shrink-0 border-l border-line/75 bg-sidebar-surface/20 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out ${
          isPaneOpen && study ? "w-[440px] opacity-100" : "w-0 opacity-0"
        }`}
      >
        <div className="w-[440px] h-full flex flex-col overflow-y-auto">
          {study && (
            <StudyPanel
              study={study}
              onClose={closeStudyPane}
              onAsk={(text) => handleSend(text, paritokOn)}
            />
          )}
        </div>
      </div>

      {/* Right sidebar: session statistics */}
      <aside className="w-[320px] shrink-0 border-l border-line/70 bg-sidebar-surface/40 p-5 flex flex-col overflow-y-auto hidden lg:flex">
        <SessionStats />
      </aside>
    </div>
  );
}
