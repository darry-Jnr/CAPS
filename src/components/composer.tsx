"use client";

import { useRef, useState } from "react";
import { PlaySendIcon, PlusIcon } from "@/components/icons";

interface ComposerProps {
  onSend?: (text: string, paritokOn: boolean) => void;
  onUploadFile?: (file: File) => void;
  disabled?: boolean;
  paritokOn: boolean;
  onToggleParitok: (value: boolean) => void;
}

export default function Composer({
  onSend,
  onUploadFile,
  disabled,
  paritokOn,
  onToggleParitok,
}: ComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !disabled;

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    resize();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function send() {
    if (!canSend) return;
    const text = value;
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    if (onSend) onSend(text, paritokOn);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file && onUploadFile) onUploadFile(file);
  }

  return (
    <div className="mx-auto w-full max-w-[768px] px-4">
      <div className="flex items-end gap-1.5 rounded-[26px] border border-line bg-surface p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-colors focus-within:border-line-strong">
        <label
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-hover hover:text-ink"
          aria-label="Add a PDF, Word, or text file"
          title="Add a PDF, Word, or text file"
        >
          <input
            type="file"
            accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.txt,text/plain"
            className="sr-only"
            onChange={handleFile}
            disabled={disabled}
          />
          <PlusIcon className="size-5" />
        </label>

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask CAPS"
          className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2 text-[16px] leading-6 text-ink outline-none placeholder:text-ink-3"
        />

        <div className="flex items-center gap-1 shrink-0 pb-0.5">
          <button
            type="button"
            onClick={() => onToggleParitok(!paritokOn)}
            aria-pressed={paritokOn}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-hover"
          >
            <span>Paritok</span>
            <span
              className={`size-1.5 rounded-full transition-colors ${
                paritokOn ? "bg-emerald-500" : "bg-ink-3"
              }`}
            />
            <span
              className={`font-semibold transition-colors ${
                paritokOn ? "text-emerald-500" : "text-ink-3"
              }`}
            >
              {paritokOn ? "ON" : "OFF"}
            </span>
          </button>

          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            aria-label="Send message"
            className="flex size-10 items-center justify-center rounded-full bg-[#1a1a1a] text-white shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 dark:bg-white dark:text-black"
          >
            <PlaySendIcon className="size-5 translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
