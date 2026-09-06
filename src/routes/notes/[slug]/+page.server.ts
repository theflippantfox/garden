/**
 * /notes/[slug] — redirect to home page with note param.
 */
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	throw redirect(307, `/?note=${encodeURIComponent(params.slug)}`);
};
