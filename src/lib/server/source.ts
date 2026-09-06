/**
 * Selects the active NotesSource at boot.
 *
 * Switch by setting NOTES_SOURCE=github and providing the GITHUB_* env vars.
 * Default is "mock", which reads from the on-disk notes/ directory.
 */

import { env } from '$env/dynamic/private';
import type { NotesSource } from '$lib/types';
import { MockNotesSource } from './mock-source';
import { GitHubNotesSource } from './github-source';

let cached: NotesSource | null = null;

export function getNotesSource(): NotesSource {
	if (cached) return cached;
	const which = (env.NOTES_SOURCE ?? 'mock').toLowerCase();
	cached = which === 'github' ? new GitHubNotesSource() : new MockNotesSource();
	return cached;
}