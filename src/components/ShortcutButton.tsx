import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ShortcutButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  shortcut: string;
  ariaShortcut?: string;
  children: ReactNode;
}

const mouseShortcuts = new Set(["LMB", "RMB"]);

export function ShortcutButton({ shortcut, ariaShortcut, children, className, title, ...props }: ShortcutButtonProps) {
  const resolvedAriaShortcut = ariaShortcut ?? shortcutToAria(shortcut);
  const shortcutTitle = typeof title === "string" && title.length > 0 ? `${title} (${shortcut})` : undefined;
  return (
    <button
      {...props}
      className={className ? `${className} has-shortcut` : "has-shortcut"}
      aria-keyshortcuts={resolvedAriaShortcut}
      title={shortcutTitle}
    >
      <span className="button-label">{children}</span>
      <kbd className="button-shortcut" data-shortcut={shortcut} aria-hidden="true" />
    </button>
  );
}

function shortcutToAria(shortcut: string): string | undefined {
  if (mouseShortcuts.has(shortcut)) return undefined;
  return shortcut
    .replace(/Ctrl/g, "Control")
    .replace(/Esc/g, "Escape")
    .replace(/←/g, "ArrowLeft")
    .replace(/→/g, "ArrowRight")
    .replace(/Space/g, "Space")
    .replace(/Enter/g, "Enter");
}
