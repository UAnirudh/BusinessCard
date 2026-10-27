/**
 * Support contact is a deployment setting. Do not point users at an inbox or
 * domain that the Tappd operator has not verified and agreed to monitor.
 */
export const SUPPORT_EMAIL = process.env.TAPPD_SUPPORT_EMAIL?.trim() || null;

