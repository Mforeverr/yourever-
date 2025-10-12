export const CURRENT_ONBOARDING_STATUS_VERSION = 2

export const coerceOnboardingStatusVersion = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }
  return 1
}

export const hasLegacyOnboardingStatusVersion = (value: unknown): boolean => {
  return coerceOnboardingStatusVersion(value) < CURRENT_ONBOARDING_STATUS_VERSION
}
