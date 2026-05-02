export const ONBOARDING_COMPLETED_KEY = 'dc_onboarding_completed';

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === '1';
}

export function markOnboardingCompleted(): void {
  localStorage.setItem(ONBOARDING_COMPLETED_KEY, '1');
}
