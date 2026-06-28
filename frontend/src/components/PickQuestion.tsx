import type { Choice } from "../engine";

interface Props {
  choices: Choice[];
  lang: string;
  selected: number[];
  correctCount: number;
  onChange: (selected: number[]) => void;
  disabled: boolean;
  revealAnswers: boolean;
}

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
      <p className="text-sm text-gray-500">
        {isMulti ? `Select all that apply (${correctCount} correct answers)` : "Select one answer"}
      </p>
      {choices.map((c) => {
        const isSelected = selected.includes(c.id);
        const atLimit = isMulti && selected.length >= correctCount && !isSelected;
        const text = lang === "en" && c.text_en ? c.text_en : c.text;
        let border = "border-gray-200 bg-white hover:border-blue-400";
        if (revealAnswers) {
          if (c.is_correct) border = "border-green-500 bg-green-50";
          else if (isSelected) border = "border-red-400 bg-red-50";
        } else if (isSelected) {
          border = "border-blue-500 bg-blue-50";
        } else if (atLimit) {
          border = "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed";
        }

        return (
          <button
            key={c.id}
            onClick={() => toggle(c.id)}
            disabled={disabled || atLimit}
            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${border} disabled:cursor-default`}
          >
            <span className="text-sm text-gray-800">{text}</span>
          </button>
        );
      })}
    </div>
  );
}
