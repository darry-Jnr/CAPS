"use client";

import { useState } from "react";
import { CheckIcon, XIcon } from "@/components/icons";
import type { StudyContent } from "@/lib/study";

interface StudyPanelProps {
  study: StudyContent;
  onClose: () => void;
  onAsk: (text: string) => void;
}

const OPTION_LABELS = ["A", "B", "C", "D"];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-3">{children}</h3>
  );
}

function KeepLearningButton({
  title,
  sub,
  prompt,
  onAsk,
}: {
  title: string;
  sub: string;
  prompt: string;
  onAsk: (text: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAsk(prompt)}
      className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:bg-surface-hover"
    >
      <span className="block text-xs font-semibold text-ink">{title}</span>
      <span className="mt-0.5 block text-[10px] font-medium text-ink-3">{sub}</span>
    </button>
  );
}

export default function StudyPanel({ study, onClose, onAsk }: StudyPanelProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const types: string[] = [];
  if (study.summary) types.push("Summary");
  if (study.quiz.length > 0) types.push("Quiz");
  if (study.keyConcepts.length > 0) types.push("Key Concepts");

  function pickOption(qIndex: number, optionIndex: number) {
    setAnswers((prev) => (prev[qIndex] === undefined ? { ...prev, [qIndex]: optionIndex } : prev));
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold tracking-tight text-ink">Study Panel</h2>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
            {types.join(" · ")}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close study panel"
          className="flex size-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <hr className="border-line" />

      {study.summary && (
        <section className="flex flex-col gap-2">
          <SectionLabel>Summary</SectionLabel>
          <p className="text-sm leading-relaxed text-ink-2">{study.summary}</p>
        </section>
      )}

      {study.summary && study.keyConcepts.length > 0 && <hr className="border-line" />}

      {study.keyConcepts.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionLabel>Key Concepts</SectionLabel>
          <ul className="flex flex-col gap-1.5">
            {study.keyConcepts.map((concept, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-ink-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-500" />
                {concept}
              </li>
            ))}
          </ul>
        </section>
      )}

      {study.quiz.length > 0 && (
        <>
          <hr className="border-line" />
          <section className="flex flex-col gap-3">
            <SectionLabel>Quiz</SectionLabel>
            {study.quiz.map((q, qi) => {
              const chosen = answers[qi];
              const answered = chosen !== undefined;
              return (
                <div key={qi} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
                  <p className="text-sm font-medium leading-relaxed text-ink">
                    {qi + 1}. {q.question}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {q.options.map((option, oi) => {
                      const isChosen = chosen === oi;
                      const isCorrect = oi === q.answerIndex;
                      let cls = "border-line text-ink-2 hover:bg-surface-hover";
                      if (answered) {
                        if (isCorrect) cls = "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                        else if (isChosen) cls = "border-red-500/60 bg-red-500/10 text-red-500";
                        else cls = "border-line/60 text-ink-3 opacity-60";
                      }
                      return (
                        <button
                          key={oi}
                          type="button"
                          onClick={() => pickOption(qi, oi)}
                          disabled={answered}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors ${cls} ${
                            answered ? "cursor-default" : "cursor-pointer"
                          }`}
                        >
                          <span
                            className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                              answered && isCorrect
                                ? "bg-emerald-500 text-white"
                                : answered && isChosen
                                  ? "bg-red-500 text-white"
                                  : "bg-surface-active text-ink-3"
                            }`}
                          >
                            {answered && isCorrect ? <CheckIcon className="size-2.5" /> : OPTION_LABELS[oi]}
                          </span>
                          <span className="min-w-0 flex-1">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}

      <hr className="border-line" />

      <section className="flex flex-col gap-2.5">
        <SectionLabel>Keep Learning</SectionLabel>
        <div className="flex flex-col gap-2.5">
          <KeepLearningButton title="Listen" sub="Audio overview of your study material" prompt="summarise this for me" onAsk={onAsk} />
          <KeepLearningButton title="Revise" sub="Flashcards from your document" prompt="quiz me with flashcards" onAsk={onAsk} />
          <KeepLearningButton title="Learn" sub="A full study guide from your materials" prompt="make a study guide for me" onAsk={onAsk} />
        </div>
      </section>

      <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
        <button
          type="button"
          onClick={() => setAnswers({})}
          className="text-xs font-bold text-ink-3 transition-colors hover:text-ink"
        >
          Reset quiz
        </button>
        <button
          type="button"
          onClick={() => onAsk("quiz me")}
          className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          Take another quiz
        </button>
      </div>
    </div>
  );
}
