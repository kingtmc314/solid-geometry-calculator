/**
 * LangContext — provides language switching between 中文 and English
 */
import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { translations } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

// Use the zh translation shape as the canonical type (both have identical keys)
type T = typeof translations.zh;

export interface LangContextValue {
  lang: Lang;
  t: T;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextValue>({
  lang: "zh",
  t: translations.zh,
  toggleLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh");

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === "zh" ? "en" : "zh"));
  }, []);

  // Cast is safe because both zh and en have identical key shapes
  const t = translations[lang] as T;

  return (
    <LangContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
