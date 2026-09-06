/**
 * Selects the active NotesSource at boot.
 *
 * Selection logic:
 *   - If NOTES_SOURCE=github → use GitHubNotesSource
 *   - If NOTES_SOURCE=mock → use MockNotesSource
 *   - If NOTES_SOURCE is unset:
 *     - If GITHUB_TOKEN + GITHUB_REPO_OWNER + GITHUB_REPO_NAME are all set → use GitHubNotesSource
 *     - Otherwise → use MockNotesSource
 */

import { env } from '$env/dynamic/private';
import type { NotesSource } from '$lib/types';
import { MockNotesSource } from './mock-source';
import { GitHubNotesSource } from './github-source';

let cached: NotesSource | null = null;

export function getNotesSource(): NotesSource {
	if (cached) return cached;

	const explicit = (env.NOTES_SOURCE ?? '').toLowerCase();
	let which: 'github' | 'mock';

	if (explicit === 'github' || explicit === 'mock') {
		which = explicit;
	} else {
		// Auto-detect: if all GitHub env vars are present, use GitHub
		which =
			env.GITHUB_TOKEN && env.GITHUB_REPO_OWNER && env.GITHUB_REPO_NAME ? 'github' : 'mock';
	}

	cached = which === 'github' ? new GitHubNotesSource() : new MockNotesSource();
	return cached;
}