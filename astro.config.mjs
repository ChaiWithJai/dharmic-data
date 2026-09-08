import { defineConfig } from 'astro/config';
import { filmReviewPlugin } from './scripts/film-review-plugin.mjs';
export default defineConfig({output:'static', devToolbar:{enabled:false}, vite:{plugins:[filmReviewPlugin()]}});
