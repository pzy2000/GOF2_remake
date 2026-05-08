import type { DialogueLineDefinition, DialogueSceneDefinition, DialogueSpeakerDefinition } from "../data/dialogues";
import { localizeTextEntry, translateText, type Locale } from "../i18n";

export function localizeDialogueSceneTitle(scene: DialogueSceneDefinition, locale: Locale): string {
  return localizeTextEntry(scene.title, scene.titleI18n, locale);
}

export function localizeDialogueLineText(line: DialogueLineDefinition, locale: Locale): string {
  return localizeTextEntry(line.text, line.textI18n, locale);
}

export function localizeDialogueSpeakerName(speaker: DialogueSpeakerDefinition, locale: Locale): string {
  return localizeTextEntry(speaker.name, speaker.nameI18n, locale);
}

export function localizeDialogueSpeakerRole(speaker: DialogueSpeakerDefinition, locale: Locale): string {
  return localizeTextEntry(speaker.role, speaker.roleI18n, locale);
}

export function localizeDialogueGroupLabel(group: DialogueSceneDefinition["group"], locale: Locale): string {
  return translateText(group === "story" ? "Glass Wake Protocol" : "Quiet Signals", locale);
}
