import { useEffect } from "react";
import { speechLangForLocale, translateText } from "../i18n";
import { useGameStore } from "../state/gameStore";
import type { Locale } from "../i18n";

const textSources = new WeakMap<Text, string>();
const attributeSources = new WeakMap<Element, Map<string, string>>();
const translatableAttributes = ["aria-label", "title", "placeholder"] as const;

function shouldSkip(element: Element | null): boolean {
  if (!element) return false;
  return !!element.closest("script,style,textarea,input,[data-i18n-skip='true']");
}

function translateTextNode(node: Text, locale: Locale, preferStored = false) {
  const parent = node.parentElement;
  if (shouldSkip(parent)) return;
  const current = node.nodeValue ?? "";
  if (!current.trim()) return;
  const stored = textSources.get(node);
  const source = stored && (preferStored || current === translateText(stored, locale)) ? stored : current;
  textSources.set(node, source);
  const translated = translateText(source, locale);
  if (node.nodeValue !== translated) node.nodeValue = translated;
}

function translateElementAttributes(element: Element, locale: Locale, preferStored = false) {
  if (shouldSkip(element)) return;
  let sources = attributeSources.get(element);
  if (!sources) {
    sources = new Map();
    attributeSources.set(element, sources);
  }
  for (const attr of translatableAttributes) {
    const current = element.getAttribute(attr);
    if (!current) continue;
    const stored = sources.get(attr);
    const source = stored && (preferStored || current === translateText(stored, locale)) ? stored : current;
    sources.set(attr, source);
    const translated = translateText(source, locale);
    if (current !== translated) element.setAttribute(attr, translated);
  }
}

function translateTree(root: ParentNode, locale: Locale, preferStored = false) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    translateTextNode(node as Text, locale, preferStored);
    node = walker.nextNode();
  }
  if (root instanceof Element) translateElementAttributes(root, locale, preferStored);
  root.querySelectorAll?.("[aria-label],[title],[placeholder]").forEach((element) => translateElementAttributes(element, locale, preferStored));
}

export function I18nRuntime() {
  const locale = useGameStore((state) => state.locale);

  useEffect(() => {
    document.documentElement.lang = speechLangForLocale(locale);
    document.documentElement.dataset.locale = locale;
    translateTree(document.body, locale, true);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text, locale);
          continue;
        }
        if (mutation.type === "attributes") {
          translateElementAttributes(mutation.target as Element, locale);
          continue;
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text, locale);
          if (node.nodeType === Node.ELEMENT_NODE) translateTree(node as Element, locale);
        });
      }
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [...translatableAttributes],
      childList: true,
      characterData: true,
      subtree: true
    });
    return () => observer.disconnect();
  }, [locale]);

  return null;
}
