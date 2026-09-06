/**
 * /notes/[slug] — redirect to home page hash route.
 */
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	throw redirect(307, `/#/notes/${encodeURIComponent(params.slug)}`);
};
