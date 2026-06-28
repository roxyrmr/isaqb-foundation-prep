import type { Choice } from "../engine";
import { t, tSelectN } from "../i18n";

interface Props {
  choices: Choice[];
  lang: string;
  selected: number[];
  correctCount: number;
  onChange: (selected: number[]) => void;
  disabled: boolean;
  revealAnswers: boolean;
}

const LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export function PickQuestion({ choices, lang, selected, correctCount, onChange, disabled, revealAnswers }: Props) {
  const isMulti = correctCount > 1;

  function toggle(id: number) {
    if (disabled) return;
    if (isMulti) {
      if (selected.includes(id)) {
        onChange(selected.filter((x) => x !== id));
      } else if (selected.length < correctCount) {
        onChange([...selected, id]);
      }
    } else {
      onChange(selected[0] === id ? [] : [id]);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        {isMulti ? tSelectN(correctCount, lang as "de" | "en") : t("selectOneLabel", lang as "de" | "en")}
      </p>
      {choices.map((c, idx) => {
        const isSelected = selected.includes(c.id);
        const atLimit = isMulti && selected.length >= correctCount && !isSelected;
        const text = lang === "en" && c.text_en ? c.text_en : c.text;

        let outerCls = "border-slate-200 bg-white hover:border-indigo-300";
        let labelCls = "text-slate-400 bg-slate-50 border-slate-200";
        let checkCls = "border-slate-200";
        let checkFill = false;

        if (revealAnswers) {
          if (c.is_correct) {
            outerCls = "border-emerald-500 bg-emerald-50";
            labelCls  = "text-emerald-700 bg-emerald-100 border-emerald-400";
            checkCls  = "border-emerald-500 bg-emerald-500";
            checkFill = true;
          } else if (isSelected) {
            outerCls = "border-red-400 bg-red-50";
            labelCls  = "text-red-500 bg-red-100 border-red-400";
            checkCls  = "border-red-400 bg-red-400";
            checkFill = true;
          }
        } else if (isSelected) {
          outerCls = "border-indigo-500 bg-indigo-50";
          labelCls  = "text-indigo-600 bg-indigo-100 border-indigo-400";
          checkCls  = "border-indigo-500 bg-indigo-500";
          checkFill = true;
        } else if (atLimit) {
          outerCls = "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed";
          labelCls  = "text-slate-300 bg-slate-100 border-slate-200";
        }

        return (
          <button
            key={c.id}
            onClick={() => toggle(c.id)}
            disabled={disabled || atLimit}
            className={`w-full text-left flex items-stretch rounded-xl border-[1.5px] overflow-hidden transition-all disabled:cursor-default ${outerCls}`}
            style={isSelected && !revealAnswers ? { boxShadow: "0 2px 8px rgba(99,102,241,0.15)" } : {}}
          >
            <span className={`w-10 flex-shrink-0 flex items-center justify-center font-mono text-[11px] font-bold border-r-[1.5px] ${labelCls}`}>
              {LABELS[idx] ?? String(idx + 1)}
            </span>
            <span className="flex-1 flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-sm text-slate-800 leading-relaxed">{text}</span>
              <span
                className={`w-5 h-5 flex-shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-all ${checkCls}`}
              >
                {checkFill && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
