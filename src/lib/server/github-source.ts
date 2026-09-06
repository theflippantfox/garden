/**
 * GitHub GraphQL notes source.
 * Reads notes from a GitHub repository's notes/ directory.
 */

import { ApolloClient, InMemoryCache, HttpLink, gql } from '@apollo/client/core';
import { env } from '$env/dynamic/private';
import matter from 'gray-matter';
import type { Note, NoteMetadata, NotesSource } from '$lib/types';
import { buildNote, slugify } from './parser';

const REPO_OWNER = env.GITHUB_REPO_OWNER ?? '';
const REPO_NAME = env.GITHUB_REPO_NAME ?? '';
const TOKEN = env.GITHUB_TOKEN ?? '';

function makeClient(): ApolloClient<unknown> {
	if (!TOKEN) {
		throw new Error('GITHUB_TOKEN not configured');
	}
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

const GET_NOTES_TREE = gql`
	query GetNotesTree($owner: String!, $name: String!, $expression: String!) {
		repository(owner: $owner, name: $name) {
			object(expression: $expression) {
				... on Tree {
					entries {
						name
						type
						oid
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

interface TreeEntry {
	name: string;
	type: string;
	oid: string;
	object?: {
		text?: string;
	};
}

interface GraphQLResponse {
	repository: {
		object: {
			entries: TreeEntry[];
		} | null;
	};
}

export class GitHubNotesSource implements NotesSource {
	private client: ApolloClient<unknown>;

	constructor() {
		this.client = makeClient();
	}

	/**
	 * Recursively fetch all markdown files from notes/ directory.
	 * GitHub GraphQL tree queries are not recursive, so we need to
	 * query subdirectories explicitly if they exist.
	 */
	private async fetchTree(path: string): Promise<Map<string, string>> {
		const result = await this.client.query<GraphQLResponse>({
			query: GET_NOTES_TREE,
			variables: {
				owner: REPO_OWNER,
				name: REPO_NAME,
				expression: `HEAD:${path}`
			}
		});

		const entries = result.data.repository?.object?.entries ?? [];
		const files = new Map<string, string>();

		for (const entry of entries) {
			if (entry.name.startsWith('_')) continue; // Skip hidden files

			if (entry.type === 'blob' && entry.name.endsWith('.md')) {
				const content = entry.object?.text ?? '';
				const fullPath = path === 'notes' ? entry.name : `${path}/${entry.name}`;
				files.set(fullPath, content);
			} else if (entry.type === 'tree') {
				// Recursively fetch subdirectories
				const subPath = path === 'notes' ? `notes/${entry.name}` : `${path}/${entry.name}`;
				const subFiles = await this.fetchTree(subPath);
				for (const [subFullPath, content] of subFiles) {
					files.set(subFullPath, content);
				}
			}
		}

		return files;
	}

	/**
	 * Convert file path to slug, handling frontmatter overrides.
	 * Path: "notes/001-welcome.md" or "notes/category/002-post.md"
	 */
	private pathToSlug(path: string, content: string): string {
		const { data } = matter(content);
		if (data.slug) return data.slug as string;

		// Strip "notes/" prefix, extension, and numeric prefixes
		const basename = path
			.replace(/^notes\//, '')
			.replace(/\.md$/, '')
			.replace(/^\d+-/, '');
		return slugify(basename);
	}

	async getAllMetadata(): Promise<NoteMetadata[]> {
		const files = await this.fetchTree('notes');
		const metadata: NoteMetadata[] = [];

		for (const [path, content] of files) {
			const slug = this.pathToSlug(path, content);
			const note = buildNote(content, slug);
			metadata.push({
				slug: note.slug,
				title: note.title,
				date: note.date,
				tags: note.tags,
				status: note.status,
				visibility: note.visibility,
				excerpt: note.excerpt,
				links: note.links
			});
		}

		// Sort by date desc
		metadata.sort((a, b) => {
			if (a.date && b.date) return b.date.localeCompare(a.date);
			return a.slug.localeCompare(b.slug);
		});

		return metadata;
	}

	async getContent(slug: string): Promise<Note | null> {
		// Fetch all files and find the one matching the slug
		const files = await this.fetchTree('notes');
		
		for (const [path, content] of files) {
			const fileSlug = this.pathToSlug(path, content);
			if (fileSlug === slug) {
				return buildNote(content, slug);
			}
		}

		return null;
	}
}

export const REPO_INFO = { REPO_OWNER, REPO_NAME };