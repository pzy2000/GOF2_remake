import { localeOptions, t } from "../i18n";
import { useGameStore } from "../state/gameStore";
import type { Locale } from "../i18n";

export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const locale = useGameStore((state) => state.locale);
  const setLocale = useGameStore((state) => state.setLocale);
  const currentLabel = localeOptions.find((option) => option.value === locale)?.label ?? localeOptions[0].label;
  return (
    <label className={`language-select ${compact ? "compact" : ""}`} data-i18n-skip="true">
      <span>{compact ? t(locale, "language.current", { language: currentLabel }) : t(locale, "language.label")}</span>
      <select
        aria-label={t(locale, "language.aria")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        {localeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
