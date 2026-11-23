/**
 * auth.js — Shared token helpers
 *
 * Party sessions created via invitation accept are stored in sessionStorage
 * so they are tab-scoped and cannot overwrite a mediator's localStorage session
 * in other browser tabs.
 *
 * Normal mediator/party logins still use localStorage as before.
 *
 * Priority: sessionStorage (invitation tab) > localStorage (normal login)
 */

export function getAuthToken() {
  return sessionStorage.getItem('nlu_token') || localStorage.getItem('nlu_token') || null
}

export function getAuthRole() {
  return sessionStorage.getItem('nlu_role') || localStorage.getItem('nlu_role') || null
}

export function getAuthUser() {
  const raw = sessionStorage.getItem('nlu_user') || localStorage.getItem('nlu_user') || null
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

/**
 * Clear only the session-scoped party token (used after invitation flow
 * completes or the party signs out from the invitation tab).
 * Does NOT touch localStorage so the mediator session in other tabs is safe.
 */
export function clearSessionAuth() {
  sessionStorage.removeItem('nlu_token')
  sessionStorage.removeItem('nlu_role')
  sessionStorage.removeItem('nlu_user')
  sessionStorage.removeItem('nlu_case_role')
}

/**
 * Returns true when the CURRENT tab is running a session-scoped party session
 * (i.e. the token was set via invitation accept, not via the normal login page).
 */
export function isInvitationSession() {
  return !!sessionStorage.getItem('nlu_token')
}

