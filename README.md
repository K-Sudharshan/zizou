# The Daily Signal 📰

> **AI Daily Tech Newspaper for Early-Career Engineers**  
> A mobile-first, installable Progressive Web App (PWA) and automated daily morning briefing delivering verified, plain-English tech and AI news targeted for **08:00 India Standard Time (IST)**.

---

## 🚀 Features

- **5-Minute Morning Intelligence Brief**: 5–7 actionable stories per day, written in plain English for a first-year computer science student interested in AI/ML, developer tools, open source, and technology careers.
- **Strict Anti-Hallucination & Source Attribution**: All candidate news is collected server-side from official RSS feeds (OpenAI, Google Research, Hugging Face, GitHub, BBC, TechCrunch). Model outputs are validated with Zod, and source URLs are strictly verified against fetched feed URLs.
- **Polished Newspaper PDF with Clickable Links**: Uses PDFKit to produce a printable A4 newspaper edition with clean pagination, running footers, and clickable source links.
- **iPhone 14 Pro PWA Experience**: Tuned for 6.1" mobile displays with safe-area insets, touch-friendly navigation, offline app shell, and same-day device caching (in `localStorage`). No App Store developer account or submission needed.
- **Safe Non-Sending Preview**: Review today's edition and download the PDF locally without triggering live email sends.
- **Secure Scheduled Delivery**: Protected by a constant-time `CRON_SECRET` bearer check. Uses India-local date-based idempotency keys (`daily-signal-YYYY-MM-DD`) with Resend to prevent duplicate sends on retries.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/) + TypeScript in Strict Mode
- **AI Synthesis**: Official [`@google/genai`](https://www.npmjs.com/package/@google/genai) TypeScript SDK with structured JSON output and runtime Zod validation
- **PDF Generation**: [PDFKit](https://pdfkit.org/) (server-side stream with standard PostScript typography)
- **Feeds Engine**: [rss-parser](https://www.npmjs.com/package/rss-parser) with bounded timeouts, HTML sanitization, and per-feed failure isolation
- **Email Delivery**: [Resend](https://resend.com/) with PDF attachments and delivery toggles
- **Testing**: [Vitest](https://vitest.dev/) with automated mocks for Gemini, RSS feeds, and Resend

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js `18.18+` or Node `20+` / `24+`
- npm `9+`

### 2. Installation
```bash
git clone <your-repo>
cd zizou
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your configuration values:

| Variable | Required | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Yes (for live AI) | From [Google AI Studio](https://aistudio.google.com/). Kept strictly server-side. |
| `GEMINI_MODEL` | No | Defaults to `gemini-3.8-flash`. |
| `RESEND_API_KEY` | In production | From [Resend Dashboard](https://resend.com/api-keys). |
| `EMAIL_FROM` | In production | Verified sender, e.g. `The Daily Signal <news@yourdomain.com>` or `onboarding@resend.dev`. |
| `EMAIL_TO` | In production | Recipient student's email address. |
| `CRON_SECRET` | In production | Secret bearer token protecting `/api/cron`. Generate with `openssl rand -hex 32`. |
| `PREVIEW_SECRET` | Optional | Protects `/api/preview` in production environments. |
| `EMAIL_DELIVERY_ENABLED` | No | Defaults to `false` locally. Set `true` in production when ready to email. |
| `TIME_ZONE` | No | Defaults to `Asia/Kolkata`. |
| `NEWS_WINDOW_DAYS` | No | Defaults to `7` days (max 14). |

> **Note**: If `GEMINI_API_KEY` is omitted in local development, the app runs a built-in verified sample preview edition so you can inspect the layout, PWA features, and PDF generator immediately!

---

## 💻 Running Locally

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

- Click **"Read / Refresh Today's Edition"** to preview today's issue.
- Click **"📄 PDF"** or **"Download Newspaper PDF"** to preview the rendered PDF.
- Click **"📲 Install"** to view iPhone 14 Pro installation instructions.

### Running Automated Tests
```bash
npm test
```
All unit and integration tests run with mock feeds, mock Gemini, and mock Resend. No real credentials or network calls are required.

### Type Checking & Linting
```bash
npx tsc --noEmit
npm run lint
```

### Production Build
```bash
npm run build
```

---

## 📱 iPhone 14 Pro Home Screen Installation

To install The Daily Signal as a standalone app on your iPhone without the App Store:

1. **Deploy to an HTTPS URL**: Deploy the project to [Vercel](https://vercel.com/) or another HTTPS host (iOS requires HTTPS for web apps).
2. **Open in Safari**: Open your deployed URL (`https://your-app.vercel.app`) in **Safari** on your iPhone 14 Pro.
3. **Tap Share**: Tap the **Share** button in Safari's bottom toolbar (the rectangle with an arrow pointing upward).
4. **Add to Home Screen**: Scroll down and select **"Add to Home Screen"**.
5. **Confirm**: Ensure "Open as Web App" is selected and tap **"Add"** in the top right.

The app icon now appears on your Home Screen. Tapping it opens The Daily Signal in full-screen standalone mode with native safe-area insets, device-side caching, and offline support.

---

## ⏰ 08:00 IST Scheduled Daily Delivery

### Cron Configuration (`vercel.json`)
The daily scheduler is configured for `30 2 * * *` UTC:
- **UTC Time**: 02:30 UTC
- **IST Time**: 08:00 IST (UTC + 5:30)

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "30 2 * * *"
    }
  ]
}
```

### Authorization
Calls to `/api/cron` must provide the `CRON_SECRET`:
```bash
curl -X GET https://your-app.vercel.app/api/cron \
  -H "Authorization: Bearer <CRON_SECRET>"
```
Any request with missing or invalid tokens is immediately rejected with HTTP `401 Unauthorized`.

### Delivery Guarantee & Idempotency
When `EMAIL_DELIVERY_ENABLED=true`, the issue is generated and sent via Resend with an idempotency key set to `daily-signal-${YYYY-MM-DD}`. If a hosting provider retries the cron job, Resend deduplicates the send request so the recipient never receives duplicate emails.

---

## 🔒 Security Principles

1. **Server-Side Exclusivity**: `@google/genai` and `resend` are imported only in server-side routes and library files. API keys are never exposed in client bundles or network responses.
2. **Zero Ingestion Hallucination**: Model-generated source URLs are reconciled against the fetched candidate feed list. If a URL was not in the original feed, it is rejected.
3. **Untrusted Feed Sanitization**: All RSS titles and excerpts are stripped of HTML tags, scripts, and tracking query params before processing.
4. **Disabled By Default**: Live email sending is disabled by default (`EMAIL_DELIVERY_ENABLED=false`) until explicitly configured for production.
