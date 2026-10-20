export interface AppConfig {
  groqApiKey: string;
  groqModel: string;
  geminiApiKey: string;
  geminiModel: string;
  resendApiKey: string;
  emailFrom: string;
  emailTo: string;
  cronSecret: string;
  previewSecret: string;
  readerGoals: string;
  timeZone: string;
  newsWindowDays: number;
  emailDeliveryEnabled: boolean;
}

export function getConfig(): AppConfig {
  const newsWindowDaysRaw = parseInt(process.env.NEWS_WINDOW_DAYS || '7', 10);
  const newsWindowDays = Math.min(Math.max(isNaN(newsWindowDaysRaw) ? 7 : newsWindowDaysRaw, 1), 14);

  return {
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.7-flash',
    resendApiKey: process.env.RESEND_API_KEY || '',
    emailFrom: process.env.EMAIL_FROM || 'Zizou <onboarding@resend.dev>',
    emailTo: process.env.EMAIL_TO || '',
    cronSecret: process.env.CRON_SECRET || '',
    previewSecret: process.env.PREVIEW_SECRET || '',
    readerGoals:
      process.env.READER_GOALS ||
      'First-year computer science student in India focused on AI/ML learning, practical projects, internships, open source, hackathons, and building a strong technology career.',
    timeZone: process.env.TIME_ZONE || 'Asia/Kolkata',
    newsWindowDays,
    emailDeliveryEnabled: process.env.EMAIL_DELIVERY_ENABLED === 'true',
  };
}

/**
 * Returns the current date formatted as YYYY-MM-DD in the configured time zone (default Asia/Kolkata).
 */
export function getEditionDate(timeZone = 'Asia/Kolkata', date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Returns a human-friendly formatted date for the newspaper header (e.g., "Wednesday, October 21, 2026").
 */
export function formatDisplayDate(dateStr: string, timeZone = 'Asia/Kolkata'): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}
