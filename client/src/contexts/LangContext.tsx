/**
 * LangContext — provides language switching between 中文 and English
 */
import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { translations } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type T = typeof translations.zh;

export interface LangContextValue {
  lang: Lang;
  t: T;
  toggleLang: () => void;
  setLang: (l: Lang) => void;
}

const LangContext = createContext<LangContextValue>({
  lang: "zh",
  t: translations.zh,
  toggleLang: () => {},
  setLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("zh");

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === "zh" ? "en" : "zh"));
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
  }, []);

  const t = translations[lang] as T;

  return (
    <LangContext.Provider value={{ lang, t, toggleLang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
