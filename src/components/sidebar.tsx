"use client";

import Link from "next/link";
import NewChatButton from "@/components/new-chat-button";

import { ChevronDownIcon, MoreVerticalIcon, SparklesIcon } from "@/components/icons";

export default function Sidebar() {
  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-line/70 bg-sidebar-surface">
      <div className="flex flex-col gap-1 p-3 pb-2">
        <NewChatButton />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2" />

      <div className="flex flex-col gap-1 p-3">
        <Link
          href="#"
          className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-ink">
            <SparklesIcon className="size-4" />
          </span>
          <span className="flex-1">Upgrade plan</span>
          <ChevronDownIcon className="size-4 shrink-0 text-ink-3" />
        </Link>

        <button
          type="button"
          className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-ink transition-colors hover:bg-surface-hover"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-xs font-semibold text-white">
            D
          </span>
          <span className="flex-1 truncate text-left">Darry</span>
          <MoreVerticalIcon className="size-4 shrink-0 text-ink-3" />
        </button>
      </div>
    </aside>
  );
}
