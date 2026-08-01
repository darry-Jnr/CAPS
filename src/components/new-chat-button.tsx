import Link from "next/link";
import { ChevronDownIcon, PlusIcon } from "@/components/icons";

export default function NewChatButton() {
  return (
    <Link
      href="/"
      className="flex h-11 w-full items-center gap-2.5 rounded-full bg-surface-hover px-3.5 text-ink transition-colors hover:bg-surface-active"
    >
      <PlusIcon className="size-[18px] shrink-0" />
      <span className="flex-1 text-left text-sm font-medium">New chat</span>
      <ChevronDownIcon className="size-4 shrink-0 text-ink-3" />
    </Link>
  );
}
