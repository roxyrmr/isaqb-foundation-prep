import { createContext, useContext, useState, type ReactNode } from "react";

type Lang = "de" | "en";

interface LangCtx {
  lang: Lang;
  toggle: () => void;
}

const LangContext = createContext<LangCtx>({ lang: "de", toggle: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("isaqb-lang") as Lang) ?? "en"
  );

  function toggle() {
    setLang((prev) => {
      const next = prev === "de" ? "en" : "de";
      localStorage.setItem("isaqb-lang", next);
      return next;
    });
  }

  return <LangContext.Provider value={{ lang, toggle }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
