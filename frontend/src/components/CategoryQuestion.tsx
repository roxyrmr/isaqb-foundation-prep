import type { Choice } from "../engine";
import { t } from "../i18n";

interface Props {
  choices: Choice[];
  lang: string;
  categories: string[];
  selected: Record<string, string>;
  onChange: (selected: Record<string, string>) => void;
  disabled: boolean;
  revealAnswers: boolean;
}

export function CategoryQuestion({ choices, lang, categories, selected, onChange, disabled, revealAnswers }: Props) {
  function assign(choiceId: number, category: string) {
    if (disabled) return;
    const key = String(choiceId);
    if (selected[key] === category) {
      const next = { ...selected };
      delete next[key];
      onChange(next);
    } else {
      onChange({ ...selected, [key]: category });
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{t("assignLabel", lang as "de" | "en")}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-3 font-medium text-gray-600 border-b border-gray-200 w-1/2">
                Statement
              </th>
              {categories.map((cat) => (
                <th key={cat} className="p-3 font-medium text-gray-600 border-b border-gray-200 text-center min-w-[120px]">
                  {cat}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {choices.map((c) => {
              const currentCat = selected[String(c.id)];
              const correctCat = lang === "en" && c.category_label_en ? c.category_label_en : c.category_label;
              const matchesCorrect = currentCat === c.category_label || currentCat === c.category_label_en;
              const isCorrect = revealAnswers && matchesCorrect;
              const isWrong = revealAnswers && !!currentCat && !matchesCorrect;
              const text = lang === "en" && c.text_en ? c.text_en : c.text;

              return (
                <tr
                  key={c.id}
                  className={`border-b border-gray-100 ${isCorrect ? "bg-green-50" : isWrong ? "bg-red-50" : "bg-white"}`}
                >
                  <td className="p-3 text-gray-800">{text}</td>
                  {categories.map((cat) => {
                    const isSelected = currentCat === cat;
                    const isThisCorrect = revealAnswers && correctCat === cat;
                    return (
                      <td key={cat} className="p-3 text-center">
                        <button
                          onClick={() => assign(c.id, cat)}
                          disabled={disabled}
                          className={`w-8 h-8 rounded-full border-2 transition-colors mx-auto block ${
                            isThisCorrect && revealAnswers
                              ? "border-green-500 bg-green-500"
                              : isSelected && !revealAnswers
                              ? "border-blue-500 bg-blue-500"
                              : isSelected && revealAnswers
                              ? "border-red-400 bg-red-400"
                              : "border-gray-300 hover:border-blue-400"
                          } disabled:cursor-default`}
                          title={cat}
                        >
                          {(isSelected || (isThisCorrect && revealAnswers)) && (
                            <span className="text-white text-xs font-bold">
                              {isThisCorrect && revealAnswers ? "✓" : "●"}
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
