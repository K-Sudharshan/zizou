# Product Requirements Document: AI Daily Tech Newspaper

**Status:** Build-ready MVP specification  
**Product name:** The Daily Signal (working title)  
**Version:** 1.0  
**Last updated:** 20 October 2026  
**Target user:** One first-year computer science student in India who wants to grow toward AI/ML roles and strong technology careers.

## 1. Product summary

The Daily Signal is an installable, mobile-first web app (PWA) that prepares and emails one short, readable technology newspaper each morning. It gathers recent, attributable stories from real RSS sources, selects items relevant to the reader, explains them in plain beginner-friendly English, and creates a polished PDF with links to original sources. The reader can add it to an iPhone 14 Pro Home Screen and open it in a standalone app-like window without publishing it to the App Store.

The paper should take about five minutes to read. It should focus on AI and machine learning, learning and career opportunities, and important general news. It should help the reader decide what to learn or do next without pretending to be a job board or replacing the original reporting.

## 2. Problem and opportunity

Early-career students face a noisy stream of technical announcements, career advice, and general news. Articles often assume prior knowledge, use jargon, or do not explain why a development matters. A short daily briefing can reduce that friction and turn news into a small, practical learning habit.

## 3. Goals and success measures

### Product goals

1. Deliver one newspaper email every day with an 08:00 India Standard Time target.
2. Make the issue readable in roughly five minutes (target 550–700 words, excluding source names and links).
3. Explain technical stories in plain English and define unavoidable terms.
4. Prioritize stories useful to an AI/ML-focused first-year CS student.
5. Include important general news when there is a relevant, recent story in the configured sources.
6. Make every news claim traceable to the original linked source.
7. Make daily reading comfortable from an iPhone Home Screen icon, with no App Store or Play Store release.
8. Keep operation simple for one reader and straightforward to run from Google Antigravity.

### MVP success criteria

- A new user can configure the app by following the README and filling environment variables without editing application logic.
- A preview run can generate and display/download a PDF without sending email.
- A scheduled production run can gather, summarize, generate a PDF, and send one email with the PDF attached.
- Generated stories use only items returned by the feed collector; source URLs are preserved and clickable.
- Missing configuration, feed failures, model errors, PDF errors, and email errors are logged clearly and do not appear as a false success.
- The Gemini API key never appears in browser code, browser network responses, logs, or committed files.

## 4. Audience and reader profile

### Primary reader

- First-year computer science student.
- Based in India; schedule and displayed dates use Asia/Kolkata.
- Interested in AI/ML fundamentals, practical projects, internships, open source, hackathons, and building a strong technology career.
- Wants straightforward, beginner-friendly explanations, not expert-level analysis.

### Personalization for MVP

The MVP is single-reader. Store the reader's goal profile and email address in server-side environment variables. Use sensible defaults matching the profile above. Do not add accounts, user registration, or a database in the MVP. Keep configuration easy to change later.

## 5. User stories

- As a student, I want a short explanation of important AI/ML news so I can follow the field without already knowing its terminology.
- As a student, I want a small practical next step connected to the news so I can keep building skills.
- As a student, I want credible links in the PDF so I can read the source or check the context myself.
- As a reader, I want the issue in my inbox each morning so I do not have to remember to open another app.
- As the app owner, I want a preview mode that cannot send mail so I can check a PDF safely before enabling delivery.
- As the app owner, I want clear logs and a failure status when something breaks so I know whether the email was sent.

## 6. Scope

### In scope for MVP

- A polished, responsive web landing page explaining the paper and delivery time.
- An installable PWA with a mobile-first newspaper reading screen for iPhone 14 Pro.
- A “Read today’s edition” flow that generates the current issue on demand without sending email, then caches that issue on the device for the day.
- A small offline app shell and access to the last locally cached issue when the phone is offline.
- A server-side RSS/Atom collector with a small, documented list of established sources.
- Freshness filtering, de-duplication, source attribution, and graceful handling when a feed fails.
- Gemini-powered selection and rewriting into validated structured content.
- A newspaper-style PDF with issue date, clear sections, readable typography, and clickable original-source links.
- Email delivery of the PDF through a transactional email provider.
- Daily scheduled execution targeting 08:00 Asia/Kolkata.
- A protected production cron endpoint and a non-sending preview flow.
- Environment-variable configuration, setup documentation, logs, and tests for critical behavior.

### Out of scope for MVP

- Multiple users, sign-up, billing, or public subscriptions.
- A user-facing feed editor, custom categories UI, or saved-article database.
- Push notifications, mobile apps, chatbots, or social posting.
- Fully automated job scraping, unverified job listings, or guarantees that a role/hackathon is still accepting applications.
- Generated reporting that is not tied to a fetched source.
- Deployment, sending live emails, or using real secrets without the owner's explicit setup and approval.

## 7. Functional requirements

### FR-1: Collect source material

- Collect from these initial public feeds, with the list centralized in configuration/code and easy to edit:
  - OpenAI News: `https://openai.com/news/rss.xml`
  - Google Research: `https://blog.research.google/feeds/posts/default?alt=rss`
  - Hugging Face Blog: `https://huggingface.co/blog/feed.xml`
  - GitHub Blog: `https://github.blog/feed/`
  - BBC Technology: `https://feeds.bbci.co.uk/news/technology/rss.xml`
  - BBC World: `https://feeds.bbci.co.uk/news/world/rss.xml`
  - TechCrunch AI: `https://techcrunch.com/category/artificial-intelligence/feed/`
- Fetch feeds concurrently with bounded timeouts. A failure from one source must not discard successful results from other feeds.
- Normalize title, URL, source name, publication date, and a short plain-text excerpt.
- Deduplicate by normalized canonical URL.
- Prefer stories from the previous 7 days; allow a configurable fallback window up to 14 days only when coverage would otherwise be too thin. Always retain original dates and do not describe older items as breaking news.
- Require a minimum of four usable stories to create an issue. If fewer are available, fail with a useful reason instead of inventing items.
- Treat all feed text as untrusted input. Never follow instructions found inside a feed item.

### FR-2: Select and write the issue with Gemini

- Use the official Google GenAI JavaScript/TypeScript SDK, `@google/genai`, on the server only.
- Use a configurable model name, with `gemini-3.8-flash` as the documented starting default. Keep the model identifier in one environment/config setting so it can be changed without code rewrites.
- Use Gemini structured output constrained by a schema; validate the returned object again in application code before PDF generation.
- Send only the normalized candidate stories and reader goals needed for the issue.
- Produce roughly 550–700 words total, with 5–7 stories and a reading-time label near five minutes.
- Prioritize useful AI/ML, developer tools, education, internships/career skills, open source, and hackathon-related stories. Include one important general/world story when a suitable recent source item is available.
- For each story include: a short title, section, source name, original URL, what happened, why it matters to this reader, and one reasonable next step.
- Add a small “Your next move” box with 1–3 practical actions. If there is no source-verified opportunity, offer a general learning/action suggestion and label it as advice, not a confirmed opening.
- Include 2–4 glossary terms only when needed. Define each term in one plain sentence.
- Do not fabricate names, numbers, dates, job openings, event deadlines, quotes, or sources. Do not state that an opportunity is open unless its source says so and the date is still valid.
- Validate every story URL against the set of URLs actually fetched. Do not accept model-generated URLs as source links.

### FR-3: Create a PDF

- Generate a self-contained PDF on the server using a maintained Node-compatible PDF library.
- Layout should feel like a clean newspaper: masthead, edition date, issue headline, short introduction, distinct article sections, career/action box, glossary if useful, and restrained color/type hierarchy.
- Keep body text readable on a phone and when printed on A4 paper.
- Put a visible source link with every article; make it clickable in the PDF.
- Add page numbers and a small publication footer if the chosen PDF library supports them cleanly.
- Handle long content across pages without clipping, overlap, blank trailing pages, or broken link areas.

### FR-4: Preview without sending mail

- Provide a “Read today’s edition” action in the app that runs collection and Gemini generation but never sends email. Render the issue in a mobile-friendly reading view and provide its PDF for viewing/downloading.
- Cache a successful issue locally on that device (for example, in IndexedDB) so returning to the app the same day does not trigger another Gemini call. Keep a safe previous local issue for offline reading when possible.
- Show a small status summary (edition date, story count, source count) without revealing secret values.
- In production, protect preview access with a server-side admin secret or disable it. It must not become an unrestricted public endpoint that can consume Gemini quota.
- Do not save generated files to ephemeral production disk as a requirement; stream the PDF response or use a deliberate persistent store only if later justified.

### FR-5: Send the daily issue

- Send one email to the configured reader address with a short, friendly subject and a concise text/HTML body plus the PDF attachment.
- Use Resend as the default transactional provider for MVP. Keep email logic behind a small service module so it can be replaced later.
- Use a date-based idempotency key when the provider supports it to reduce duplicate sends on duplicate cron invocations.
- Validate required email configuration before collecting/generating a production issue.
- Email sending must be disabled in local development by default. A preview must never send mail.
- Return a truthful success only after the email provider confirms acceptance. Log provider error codes/messages safely; never log API keys or the full attachment.

### FR-6: Schedule and secure daily delivery

- Use one scheduled serverless job, configured for `30 2 * * *` UTC (08:00 IST).
- Document the hosting provider's timezone and timing limits. If the selected plan cannot guarantee a specific minute, state the practical delivery window clearly.
- The cron route must verify a secret bearer token using a constant-time comparison where practical. Reject unauthorized calls with HTTP 401.
- Do not make the cron route callable as an unprotected public “send now” endpoint.
- Add a reasonable function timeout, prevent cache use for the cron response, and log run ID, issue date, feed success counts, story count, and outcome without sensitive values.
- Document that scheduler retry behavior depends on the hosting provider. Provide a safe manual retry method that uses the same date-based idempotency key.

### FR-7: Web experience and accessibility

- The home page communicates the value, sample sections, five-minute reading length, and 08:00 IST target.
- The app is mobile-first and tuned for a 6.1-inch iPhone 14 Pro display, including safe-area insets, touch-sized controls, legible reading typography, and no horizontal scrolling.
- Make it installable as a Progressive Web App: provide a valid web app manifest, app name/short name, theme/background colors, suitable 192px and 512px icons, iOS touch icon/meta support, and standalone display behavior.
- Provide a short in-app “Install on iPhone” guide: open the secure hosted URL in Safari, tap Share, choose Add to Home Screen, keep “Open as Web App” enabled, then tap Add. The installed icon is device-local.
- Provide a local browser experience on desktop for development and issue review; installation is optional there.
- Cache the application shell and the reader's last generated issue on the device; clearly explain that creating a new issue needs an internet connection.
- Daily email remains the delivery/notification channel. Do not add web push in MVP, which avoids extra service setup and permission prompts.
- Use responsive design for phone and desktop, semantic headings, keyboard-visible focus, sufficient color contrast, and accessible button/link labels.
- Include a safe preview path for the owner; do not show secret or server error details in the public UI.
- Do not claim that delivery is active until required environment variables and scheduler deployment are configured.

## 8. Content and editorial rules

1. Plain English is the default. Prefer short sentences and everyday words.
2. Explain a technical idea in terms of what it does and why a student should care.
3. Attribute claims to the source; preserve headline meaning without copying whole articles.
4. Clearly separate reporting from editorial advice or “next step” suggestions.
5. Never invent source content to fill a quota. If news is thin, return a clear generation failure/low-coverage state.
6. Do not imply an internship, hackathon, or program is accepting applications without a dated source that confirms it.
7. Avoid sensational language, predictions stated as fact, and promotional claims copied from company posts without context.
8. Prefer balanced coverage across organizations and regions; do not allow one publisher to dominate every issue when alternatives are available.

## 9. Proposed architecture

Use the simplest maintainable implementation that fits the workspace. Preferred default when starting from an empty folder:

- **Web app and server routes:** Next.js App Router + TypeScript.
- **Feed parsing:** RSS/Atom parser package with request timeout and source-level failure isolation.
- **AI:** `@google/genai` calling Gemini from server-only code; structured output and runtime schema validation.
- **PDF:** Node-compatible PDF library that supports pagination and external URI annotations.
- **Email:** Resend SDK with PDF attachment and idempotency support.
- **Scheduler/hosting:** Vercel Cron calling a protected route; document exact 08:00 IST mapping and plan timing limitations.
- **Persistence:** None for the single-reader MVP. Avoid adding a database unless required for idempotency/locks beyond what the email provider can safely provide.
- **Styling:** CSS or the existing framework's smallest supported styling option; no unnecessary design system or UI kit.
- **Mobile app installation:** PWA/Home Screen installation, no native iOS container and no app-store submission.

Keep code divided into small modules: source collection, editorial generation, schema/types, PDF rendering, email delivery, and cron/preview handlers. Avoid coupling the newsletter logic to the visual page.

## 10. Environment variables

Provide `.env.example` with names and safe placeholders only. Never put real key values in it.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Gemini server-side API key. Never expose to the client or commit it. |
| `GEMINI_MODEL` | No | Model override; default `gemini-3.8-flash` at initial implementation. |
| `RESEND_API_KEY` | Yes for delivery | Transactional email API key. This is separate from the Gemini API key. |
| `EMAIL_FROM` | Yes for delivery | Verified sender address/name. |
| `EMAIL_TO` | Yes for delivery | Single reader's destination address. |
| `CRON_SECRET` | Yes in deployment | Random secret protecting scheduled route. |
| `PREVIEW_SECRET` | Production preview only | Separate secret for protected preview route, or disable preview in production. |
| `READER_GOALS` | No | Personalization text with safe default for first-year AI/ML student. |
| `TIME_ZONE` | No | Default `Asia/Kolkata`; scheduling itself must use host-supported UTC config. |
| `NEWS_WINDOW_DAYS` | No | Default 7; maximum 14. |
| `EMAIL_DELIVERY_ENABLED` | No | Default `false` locally; explicitly set `true` in production after setup. |

Document where to obtain each key, how to configure local `.env.local`, and how to add production secrets through the hosting dashboard. Never ask the user to paste secrets into chat.

## 11. Non-functional requirements and code constraints

- Use TypeScript strict mode and current stable versions compatible with the actual environment.
- Follow the official current Google GenAI SDK; do not use deprecated `@google/generative-ai` APIs or copy stale snippets.
- Keep all provider SDKs and secrets server-side. Never prefix secret variables with `NEXT_PUBLIC_`.
- Validate all external data and model output. Treat RSS content as untrusted and strip HTML before it reaches prompt/PDF/HTML email.
- Escape all dynamic email HTML. Prevent URL schemes other than `https:` for external links.
- Add bounded timeouts to feed and provider requests. Handle partial feed failures, quota/rate-limit responses, malformed model output, and email-provider failures.
- Do not retry email delivery blindly. Use the provider's idempotency feature where supported and make retry behavior explicit.
- Do not use browser local storage for secrets, add credentials to source control, log secrets, or send emails during build/startup.
- Avoid unnecessary databases, queues, user authentication, dependencies, abstractions, animations, and speculative features.
- Use accessible semantic HTML and responsive design.
- Keep the interface mobile-first and installable as a PWA. Do not build a native iOS app, App Store listing, or push notification system for MVP.
- No deployment, public sharing, real email, or live cron activation during development unless the user explicitly asks.
- Keep user changes in an existing workspace; inspect before replacing or deleting anything.

## 12. Error handling and observability

- Feed issue: record source name and safe error summary; continue with other feeds. Fail issue generation only when usable coverage is below minimum.
- Gemini issue: log request/run ID and safe provider error; do not log prompts containing sensitive values beyond the public source material.
- Validation issue: reject the malformed generated issue and return a safe actionable error.
- PDF issue: return an error status; do not email an empty/partial PDF.
- Email issue: report failed send and provider response ID/error; do not report success.
- Cron logs should let the owner answer: Did it start? How many feeds worked? Was there enough material? Did generation pass? Did the PDF finish? Was email accepted?
- Public responses must not expose stack traces, API keys, or provider credentials.

## 13. Testing and acceptance checklist

The build is accepted when all of the following are satisfied:

### Automated checks

- Type check, lint, and production build pass.
- Unit tests cover feed normalization/deduplication/freshness, minimum-coverage behavior, model schema validation, unsafe URL rejection, PDF link generation/pagination basics, email delivery disabled by default, cron authentication, and date-based idempotency key creation.
- Integration tests mock feeds, Gemini, and Resend; tests must not require real API keys or send mail.
- A test proves one failed feed does not fail the issue if enough other feeds succeeded.
- A test proves a preview returns a PDF and never calls the email provider.

### Manual acceptance

- Open the site at local development URL and inspect phone/desktop layouts.
- Deploy to an HTTPS URL, open it in Safari on iPhone 14 Pro, add it to the Home Screen as a web app, and verify it launches in standalone mode with the expected icon/name.
- Generate today's issue once in the installed app, verify it renders at phone width, then revisit the same-day issue without another Gemini request. Check the cached issue can be opened offline.
- Preview one issue using mocked or explicitly configured local services; inspect PDF page breaks, legibility, date, attribution, and clickable links.
- Confirm local preview does not send email.
- Confirm unauthorized cron request returns 401.
- Confirm scheduled route reports a failure when an essential env var is missing.
- Only after owner setup, deliberately send one test email to the configured recipient and verify the attachment.
- Confirm Vercel production schedule maps to the documented local time and that timing caveat is explained for the selected plan.

## 14. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| A feed changes its format or is unavailable | Isolate failures per source, monitor feed success, keep a small redundant source set, and require minimum usable coverage. |
| The model invents detail or an opportunity | Ground each article in a fetched item, validate source URLs, require explicit opportunity evidence, and label advice as advice. |
| Gemini quota or billing surprises | Use a Flash model, keep input and output bounded, expose model setting, and advise the owner to configure billing alerts/limits. |
| Gemini key leaks from browser code | Server-only SDK/routes, environment secret, security check for accidental client imports and public env prefixes. |
| PDF links or text break on pagination | Unit/manual visual checks; maintain a safe text layout and valid HTTPS-only link annotation code. |
| Cron is late or fails | Explain host timing window and retry behavior, log clear outcomes, and provide a safe manual retry approach. |
| Duplicate email on repeated cron event | Date-based provider idempotency key; do not rely on in-memory state as a durable lock. |
| Email delivery is not set up | Make requirements visible; keep delivery disabled by default until sender, recipient, provider key, and explicit enable flag are configured. |

## 15. Owner setup and launch sequence

1. Open the project folder in Google Antigravity.
2. Let the coding agent inspect the repository and read this PRD before editing.
3. Install dependencies and implement the MVP without deploying or sending live email.
4. Run the app locally, automated checks, and a non-sending preview; review the generated PDF.
5. Create/configure a Gemini API key in Google AI Studio and add it as `GEMINI_API_KEY` in local secrets/environment settings. Do not paste it into code or chat.
6. Configure Resend, verify the sender domain, and set `RESEND_API_KEY`, `EMAIL_FROM`, and `EMAIL_TO`.
7. Add `CRON_SECRET` and other production environment values in the hosting dashboard. Keep `EMAIL_DELIVERY_ENABLED=false` until ready.
8. Deploy only when the owner explicitly chooses to do so. An HTTPS host URL is needed to install the PWA on the iPhone; local development on a computer is for development, not remote daily use.
9. On iPhone, open the deployed URL in Safari, tap Share → Add to Home Screen, leave “Open as Web App” turned on, and tap Add. This creates an app icon without an App Store release. Then set `EMAIL_DELIVERY_ENABLED=true`, verify cron security/logs, and intentionally send one test issue.

## 16. Reference documentation

- Gemini models and recommended current model IDs: [Gemini API models](https://ai.google.dev/gemini-api/docs/models)
- Official JavaScript SDK and generation example: [Gemini API getting started](https://ai.google.dev/gemini-api/docs/get-started)
- Structured JSON responses: [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- API key safety: [Using Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key)
- Add a website as an iPhone web app: [Apple Support](https://support.apple.com/en-az/guide/iphone/iphea86e5236/26/ios/26)
- Home Screen web app behavior: [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
