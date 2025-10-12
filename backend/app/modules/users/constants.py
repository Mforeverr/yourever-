"""Constants for the users module."""

CURRENT_ONBOARDING_STATUS_VERSION = 2
LEGACY_ONBOARDING_STATUS_VERSION = 1


def coerce_onboarding_status_version(value) -> int:
    try:
        version = int(value)
    except (TypeError, ValueError):
        return LEGACY_ONBOARDING_STATUS_VERSION
    return version if version > 0 else LEGACY_ONBOARDING_STATUS_VERSION
