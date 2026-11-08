# Waitro

**Which AI is the right one?** A small, hand-curated index of AI models with an AI search on top.

Describe what you want to do ("upscale old home videos on my Mac", "transcribe meetings and summarize them") and Waitro picks the models that fit, explains the trade-offs and chains several models when one can't do the job. You can also browse everything in a sortable table, by task, or open a model page to see its licence, hardware, price, benchmarks and whether a newer or more efficient model has replaced it.

## How it works

- **The catalog is plain YAML** in `data/`: one file per model in `data/models/`, editorial top picks per task in `data/rankings/`, and the list of tasks in `data/taxonomy.yaml`. CI rejects anything that doesn't validate.
- **The server** (`server/`, Node 24, no framework) loads the catalog into memory and SQLite (full-text index), serves the API and the web app.
- **The web app** (`web/`) is Angular 22 with Tailwind CSS 4 and Lucide icons. The production build is served by the Node server.
- **AI search** sends the whole catalog (as a compact, prompt-cached digest) and the request to Claude via OpenRouter, which answers with structured JSON. The server drops any model id that isn't in the catalog and flags chains whose input and output types don't connect. Answers are cached for a week, and there are per-IP and per-day limits. Without an API key, search falls back to keyword matching.
- **Stats** (GitHub stars, Hugging Face downloads) are refreshed nightly into `data/stats.json`.

## Run locally

```sh
cd web && npm install && npm run build    # Angular app -> web/dist
cd ../server && npm install
npm run dev                               # http://localhost:3000 (API + built app)
npm test
npm run validate                          # check data/
```

For frontend work, run `npm start` in `web/` as well: Angular's dev server on http://localhost:4200 reloads on save and proxies `/api` to port 3000.

Put `OPENROUTER_API_KEY` (or `ANTHROPIC_API_KEY`) in `.env` at the repo root to turn on AI search; `npm run dev` loads it. Optional settings are in `.env.example`.

## Deploy

Every push to `main` builds `ghcr.io/eliasthecactus/waitro:latest`. See `docker-compose.yml`; the search cache lives in `/data`.

## Add or fix a model

See [CONTRIBUTING.md](CONTRIBUTING.md). Every model page also links to its file.
