# Open Threat Data

Open source intelligence (OSINT) and threat analysis platform for teams. Run lookups on IPs, domains, hashes, URLs, emails, and SSL endpoints; see who else checked the same target and leave comments (when signed in).

## Features

### Tools (dashboard, requires sign-in)

- **IP Intelligence** — GeoIP, ASN, abuse reports, reverse DNS, GreyNoise, AlienVault OTX
- **Domain Intelligence** — WHOIS, DNS records, subdomains (Certificate Transparency)
- **Hash Analysis** — File hash reputation and malware detection (VirusTotal, MalwareBazaar)
- **SSL Certificate Inspector** — Validity, issuer, SANs, chain
- **Email Reputation** — Format, MX resolution, breach check (Have I Been Pwned)
- **Latency Monitor** — RTT to host or URL
- **URL Tracer** — Unshorten URLs, redirect chain, threat check (URLhaus, Safe Browsing)
- **OSINT Monitor** — Team-wide recent lookups

### Guest lookup

- **Home page search** — Anyone can paste a hash, URL, domain, IP, or email and get results without an account.
- **Lookup results page** — Shows the same result and “who checked” / comments. Only logged-in users can post comments.

### Stack

- **Backend**: AdonisJS v6, Lucid ORM, VineJS validation
- **Frontend**: Inertia.js, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL (recommended) or SQLite; set `DATABASE_URL` for PostgreSQL

## Project structure

```
open-threat-data/
├── app/
│   ├── controllers/          # auth, users, intel, lookup, teams, audits, etc.
│   ├── models/               # User, LookupHistory, LookupComment, Team, ...
│   ├── services/             # intel (ip, domain, hash, ssl, email, latency, url), lookup_type_detector, lookup_history, email
│   └── validators/
├── config/                   # auth, database, inertia, limiter, mail, shield, ...
├── database/migrations/      # users, sessions, lookup_history, lookup_comments, teams, rate_limits, ...
├── inertia/
│   ├── app/                  # React app entry
│   ├── pages/                # home, login, signup, dashboard, tools/*, lookup, settings, teams
│   ├── components/           # layouts, ui, tools (checked-by, lookup-comments)
│   └── emails/               # React Email templates
├── resources/
│   ├── css/                  # app.css (Tailwind)
│   └── views/                # Edge layout for Inertia
└── start/
    ├── routes.ts
    ├── env.ts                # env validation
    └── health.ts
```

## Getting started

### Prerequisites

- Node.js 22+
- npm 10+

### Quick setup

```bash
chmod +x setup.sh   # macOS/Linux
./setup.sh
npm run dev
```

App: `http://localhost:3333`

### Manual setup

1. **Install and env**

   ```bash
   npm install
   cp .env.example .env
   node ace generate:key
   ```

2. **Database**

   - **PostgreSQL**: set `DATABASE_URL` in `.env` (e.g. `postgresql://user:pass@host:port/db`). Then run migrations.
   - **SQLite**: leave `DATABASE_URL` unset; SQLite is used automatically.

   ```bash
   node ace migration:run
   ```

3. **Optional**: seed users

   ```bash
   node ace db:seed
   ```

4. **Run**

   ```bash
   npm run dev
   ```

## Environment variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `3333`). On Railway, use the injected `PORT`. |
| `HOST` | Host for URLs (e.g. `localhost` or your domain). |
| `APP_KEY` | Required; generate with `node ace generate:key`. |
| `DATABASE_URL` | Optional. When set, PostgreSQL is used; otherwise SQLite. |
| `SESSION_DRIVER` | `cookie` or `memory`. |
| `LIMITER_STORE` | `database` or `memory` for rate limiting. |

**OSINT / threat intel (optional):**

- `VIRUSTOTAL_API_KEY`, `ABUSEIPDB_API_KEY`, `MALWAREBAZAAR_API_KEY`, `URLHAUS_API_KEY` (abuse.ch)
- `GOOGLE_SAFEBROWSING_API_KEY`, `HIBP_API_KEY`, `GREYNOISE_API_KEY`, `OTX_API_KEY`

Tools still run without keys but may return partial or “no key” results. See `.env.example` for full list and comments.

**Auth / email:**

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` for Google OAuth
- `SMTP_*`, `FROM_EMAIL`, etc. for mail

## Deployment (e.g. Railway)

1. Set env in the host (including `DATABASE_URL` for PostgreSQL and `PORT` if the host injects it).
2. Build and run:

   ```bash
   npm run build
   node ace migration:run
   npm start
   ```

Railway sets `PORT` automatically; the app already uses it from env.

## API and docs

- **RapiDoc**: `GET /docs` (interactive API docs).
- **Swagger JSON**: `GET /swagger`.

Auth and intel endpoints live under `/api/v1/auth` and `/api/v1/intel`. Guest lookup is a single public route: `GET /lookup?q=<target>`.

## Testing

```bash
npm test
```

## Google OAuth2

1. [Google Cloud Console](https://console.cloud.google.com/) → project → APIs & Services → Credentials.
2. OAuth consent screen and scopes as needed.
3. Create OAuth client ID (Web). Redirect URI: `http://localhost:3333/google/callback` (or your production URL).
4. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`. Production: use production callback URL and client credentials.

## License

UNLICENSED
