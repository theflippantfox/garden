/**
 * GitHub GraphQL notes source.
 *
 * STATUS: scaffold only — not yet wired to a real repo.
 * To activate:
 *   1. Set env vars GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME.
 *   2. In src/lib/server/source.ts, switch the default to `new GitHubNotesSource()`.
 *   3. Implement getAllMetadata() using the GraphQL query in the design doc
 *      (repository(owner, name) > object(expression: "main:notes") > ...on Tree.entries).
 *   4. Implement getContent() with fetch() to raw.githubusercontent.com.
 *
 * Keeping the Apollo client setup here so the activation step is contained.
 */

import { ApolloClient, InMemoryCache, HttpLink, gql } from '@apollo/client/core';
import { env } from '$env/dynamic/private';
import type { Note, NoteMetadata, NotesSource } from '$lib/types';
import { buildNote } from './parser';

const REPO_OWNER = env.GITHUB_REPO_OWNER ?? '';
const REPO_NAME = env.GITHUB_REPO_NAME ?? '';
const TOKEN = env.GITHUB_TOKEN ?? '';

function makeClient(): ApolloClient<unknown> {
	return new ApolloClient({
		link: new HttpLink({
			uri: 'https://api.github.com/graphql',
			headers: {
				Authorization: `Bearer ${TOKEN}`,
				'Content-Type': 'application/json'
			}
		}),
		cache: new InMemoryCache()
	});
}

const GET_NOTES_METADATA = gql`
	query GetNotesMetadata($owner: String!, $name: String!) {
		repository(owner: $owner, name: $name) {
			object(expression: "main:notes") {
				... on Tree {
					entries {
						name
						type
						object {
							... on Blob {
								text
							}
						}
					}
				}
			}
		}
	}
`;

export class GitHubNotesSource implements NotesSource {
	private client: ApolloClient<unknown>;

	constructor() {
		this.client = makeClient();
	}

	async getAllMetadata(): Promise<NoteMetadata[]> {
		// TODO: implement — see GET_NOTES_METADATA above
		// 1. client.query({ query: GET_NOTES_METADATA, variables: { owner, name } })
		// 2. Parse tree entries; for each .md file, run buildNote(text, slug) and
		//    extract { slug, title, date, tags, status, visibility, excerpt, links }
		// 3. Return sorted by date desc
		throw new Error('GitHubNotesSource.getAllMetadata: not yet implemented');
	}

	async getContent(slug: string): Promise<Note | null> {
		// TODO: implement
		// const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/notes/${slug}.md`;
		// const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
		// if (!res.ok) return null;
		// return buildNote(await res.text(), slug);
		throw new Error('GitHubNotesSource.getContent: not yet implemented');
	}
}

export const REPO_INFO = { REPO_OWNER, REPO_NAME };