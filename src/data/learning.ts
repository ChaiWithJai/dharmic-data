/** Public Maven destinations checked September 8, 2026. No local signup form. */
export const MAVEN_SCHOOL_URL = 'https://maven.com/a-plus';
/** Published free resource; configured delivery link was verified byte-for-byte. */
export const MAVEN_FILM_GUIDE_URL = 'https://maven.com/a-plus/o/585d59';

export interface LightningLesson {
  id: string;
  title: string;
  description: string;
  url: string;
  startsAt: string;
  endsAt: string;
  dateLabel: string;
  month: string;
  day: string;
}

export const lightningLessons: readonly LightningLesson[] = [
  {
    id: 'claude-chatgpt',
    title: 'Comparing Claude v ChatGPT for Work w/ live prompting',
    description: 'Bring a real workstream. Compare writing skills, evaluate what the models make, and find a useful next step.',
    url: 'https://maven.com/p/06e5fe/comparing-claude-v-chat-gpt-for-work-w-live-prompting',
    startsAt: '2026-09-09T12:00:00-04:00',
    endsAt: '2026-09-09T12:45:00-04:00',
    dateLabel: 'Wednesday, September 9, 2026 · 12:00 PM EDT',
    month: 'Sep',
    day: '09',
  },
  {
    id: 'claude-local',
    title: 'Claude v Local AI (Live Demo on NVIDIA’s Grace–Blackwell)',
    description: 'Explore when local AI makes sense. Ask hard questions while Jai demonstrates the tools and their limits.',
    url: 'https://maven.com/p/f34cd1/claude-v-local-ai-live-demo-on-nvidia-s-grace-blackwell',
    startsAt: '2026-09-10T12:00:00-04:00',
    endsAt: '2026-09-10T12:45:00-04:00',
    dateLabel: 'Thursday, September 10, 2026 · 12:00 PM EDT',
    month: 'Sep',
    day: '10',
  },
];

/** Exact-host allowlist. Reject credentials, custom ports, controls and URL tricks. */
export function validateMavenUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate || /[\u0000-\u0020\u007f\\]/.test(candidate)) return null;
  try {
    const url = new URL(candidate);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'maven.com' ||
      url.username !== '' ||
      url.password !== '' ||
      url.port !== ''
    ) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function getLessonPresentation(endsAt: string, nowMs = Date.now()) {
  const endMs = Date.parse(endsAt);
  if (!Number.isFinite(endMs) || !Number.isFinite(nowMs)) {
    return { phase: 'unknown', label: 'Check Maven for availability', action: 'View lesson on Maven' } as const;
  }
  if (nowMs >= endMs) {
    return { phase: 'past', label: 'Past lesson · check availability', action: 'View lesson on Maven' } as const;
  }
  return { phase: 'scheduled', label: 'Free · 45-minute Lightning Lesson', action: 'See details on Maven' } as const;
}

export function getFilmGuide(value: unknown) {
  const url = validateMavenUrl(value);
  return {
    title: "Turn your team's files into gold",
    subtitle: "Build your team's digital twin with GPT-6 Astra + local AI",
    description: 'Turn meeting notes, briefs and spreadsheets into shared context your team can trust. Follow a worked example, use the prompts and starter kit, and measure whether you reduce repeated explanation and rework.',
    available: url !== null,
    url: url ?? MAVEN_SCHOOL_URL,
    action: url ? 'Get the free guide on Maven' : 'Get updates on Maven',
    status: url ? 'Free guide + starter kit' : 'Coming next · free guide',
    note: url
      ? 'Continue to Maven for the guide and its signup details.'
      : 'The guide is being prepared. Visit Jai’s Maven school and choose “Get updates” to join his mailing list.',
  };
}
