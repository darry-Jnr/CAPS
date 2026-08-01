import Link from "next/link";
import { MoreVerticalIcon, PencilIcon } from "@/components/icons";

export type RecentChat = {
  id: string;
  title: string;
};

export default function RecentChats({ items }: { items: RecentChat[] }) {
  return (
    <ul className="space-y-0.5">
      {items.map((chat) => (
        <li
          key={chat.id}
          className="group relative flex h-9 items-center rounded-lg px-2 text-sm text-ink-2 transition-colors hover:bg-surface-hover"
        >
          <Link href="/recents" className="min-w-0 flex-1 truncate pr-10">
            {chat.title}
          </Link>
          <div className="absolute right-1 hidden items-center gap-0.5 bg-gradient-to-l from-surface-hover from-60% to-transparent pl-1 group-hover:flex">
            <button
              type="button"
              aria-label="Rename chat"
              className="flex size-6 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-active hover:text-ink"
            >
              <PencilIcon className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="More options"
              className="flex size-6 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-active hover:text-ink"
            >
              <MoreVerticalIcon className="size-3.5" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
