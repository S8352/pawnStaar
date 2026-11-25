/**
 * `localStorage` keys for the viewer's own broadcast preferences.
 *
 * Namespaced under `wcc:` and collected here so a key is spelled once: a typo
 * in one of these reads as "the viewer never set it", which is silent.
 */

/** `'off'` disables the single-key shortcuts (←, →, Home, End, X, L). */
export const SINGLE_KEY_SHORTCUTS_STORAGE_KEY = 'wcc:singleKeyShortcuts'

/** `'on'` hides evaluations and results until the viewer asks for them. */
export const SPOILER_FREE_STORAGE_KEY = 'wcc:spoilerFree'

/** `'on'` announces each new move through a live region. */
export const MOVE_ANNOUNCE_STORAGE_KEY = 'wcc:announceMoves'
