// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

import { enMessages } from "./en"

export const locales = {
  en: enMessages,
}

export type LocaleCode = keyof typeof locales
