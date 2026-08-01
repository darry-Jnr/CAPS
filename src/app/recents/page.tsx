import Link from "next/link";
import { ClockIcon, MoreVerticalIcon, PencilIcon } from "@/components/icons";

const conversations = [
  { id: "1", title: "Explain how Next.js works", date: "Today" },
  { id: "2", title: "Plan a 3-day trip to Tokyo", date: "Today" },
  { id: "3", title: "Write a Python script for data cleaning", date: "Yesterday" },
  { id: "4", title: "Summarize this research paper", date: "Yesterday" },
  { id: "5", title: "Ideas for a weekend side project", date: "Jul 28" },
];

export default function RecentsPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="px-6 pt-10 sm:px-10">
        <div className="flex items-center gap-2.5">
          <ClockIcon className="size-5 text-ink-2" />
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Recents
          </h1>
        </div>
        <p className="mt-1.5 text-sm text-ink-3">
          Pick up where you left off.
        </p>
      </header>

      <ul className="mx-auto w-full max-w-3xl space-y-2 px-6 py-6 sm:px-10">
        {conversations.map((conversation) => (
          <li
            key={conversation.id}
            className="group flex h-12 items-center gap-3 rounded-xl border border-line bg-surface px-4 transition-colors hover:bg-surface-hover"
          >
            <ClockIcon className="size-4 shrink-0 text-ink-3" />
            <Link
              href="#"
              className="min-w-0 flex-1 truncate text-sm text-ink"
            >
              {conversation.title}
            </Link>
            <span className="shrink-0 text-xs text-ink-3">
              {conversation.date}
            </span>
            <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
              <button
                type="button"
                aria-label="Rename chat"
                className="flex size-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-active hover:text-ink"
              >
                <PencilIcon className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="More options"
                className="flex size-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-active hover:text-ink"
              >
                <MoreVerticalIcon className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
