# Keep the template and give the story more pages

Jai's correction is the design constraint. The preceding website release replaced the existing visual template even though the school story could have worked within it. The implementation confused a new content hierarchy with a new visual identity.

The original template at `c31ef33` is the visual source. This version restores its Webflow styles, Fredoka and Inter typography, green and orange headline blocks, star illustrations, original character animations and falling-pill composition. Shared `TemplateLayout.astro` applies that system across the main pages. `template-school.css` adapts content and responsive spacing; it does not import the rejected serif design.

## Page ownership

| Page | What it does |
| --- | --- |
| `/` | Introduces the good-teacher and great-teacher promise, briefly connects the NVIDIA win, and offers clear paths into the site. |
| `/school` | Explains Conscious Compute, the learning experience, paid places versus premium attendance, conditional pilots, and the Homer connection to the Civilizational Shelf. |
| `/about` | Tells Jai's story in the original About template. The NVIDIA win with friends leads. The 60-second film follows the founder narrative with its concept, inspiration and significance. |
| `/learn` | Holds Maven Lightning Lessons, the live field-notes resource and the expandable archive of nine learner accounts and four case studies. |

The existing vlog, shop and atlas remain. The free Maven resource and PDF are unchanged. The film goal remains stalled; public pages use the poster and local review serves the same existing cut.

## What was preserved and checked

The original script order and home page identifier are retained so Webflow can find the animation targets. The Rive runtime was checked for loaded and playing state, a painted canvas, and changing image pixels. The restored pills use the original scroll-animation identifiers and transforms, with eleven labels relevant to the school.

The evidence arrays exactly match the original nine testimonials and four cases. Their destinations were not recreated or changed. The source lives in `src/data/evidence.ts`; the archive uses the existing template's card classes.

Checks cover all four pages at 320, 390, 768 and 1440 pixels. They inspect text bounds as well as document overflow, keyboard navigation, actual template assets, reduced-motion behavior, the Maven destinations and existing shop/vlog behavior. Scrolling to a rotated About photograph previously moved its overflow container sideways and clipped text; `overflow: clip` prevents that unintended pan. Mobile header clearance and wrapped heading spacing were also corrected.

The private review is still at `http://127.0.0.1:4327/about#film`. It does not render a new film or copy the video into production. Its stream and seek behavior are checked separately from creative acceptance.

## Continue without losing the direction

Read `AGENTS.md` first. Preserve the visual template when moving or editing content. A change in the story does not imply replacing the template. Keep source commands tied to this checkout through `scripts/dd.mjs`. The app's unfinished film goal stays stalled; the website work remains documented in parent issue #2 and PR #4.

## Published correction

The restored site is live at https://dharmicdata.org. Production deploy `6a9f8fe9816f13ec6968c253` uses code `50cee4d`. Ten live destinations matched the isolated build byte for byte, including all four main pages and the PDF. The private film endpoint returned 404. The same artifact passed browser checks on Netlify at 390 and 1440 pixels, after local checks at all four widths. Receipts are in `output/template-restoration`.

PR #4 holds the current source update and has not been merged into the configured `main` branch. The preceding editorial release is historical evidence, not the current design direction.
