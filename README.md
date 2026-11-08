# Waitro

**Which AI is the right one?** A curated index of AI models with an AI search on top.

Describe what you want to do ("upscale old home videos on my Mac", "transcribe meetings and summarize them") and Waitro picks the models that fit, explains the trade-offs and chains several models when one can't do the job. You can also browse everything in a sortable table, by task, or open a model page to see its licence, hardware, price, benchmarks and whether a newer or more efficient model has replaced it.

## How it works

Waitro is a static site. There is no server.

- **The catalog is plain YAML** in `data/`: one file per model in `data/models/`, editorial top picks per task in `data/rankings/`, and the list of tasks in `data/taxonomy.yaml`. The build rejects anything that doesn't validate.
- **The build** (`tools/`, Node 24) validates the catalog and turns it into static JSON in `web/public/data/`: the model list, one file per model, rankings and a compact digest for the AI. It fetches fresh GitHub stars and Hugging Face downloads at the same time.
- **The web app** (`web/`) is Angular 22 with Tailwind CSS 4 and Lucide icons. It reads only those static files.
- **AI search** runs in the browser with the visitor's own [OpenRouter](https://openrouter.ai) key. The key is stored only in that browser and sent straight to OpenRouter. The model (default `~deepseek/deepseek-flash-latest`) reads the whole digest and answers with structured JSON; the app drops any model id that isn't in the catalog and flags chains whose input and output types don't connect. Answers are cached in the browser for a week. Without a key, search falls back to keyword matching.
- **Hosting** is GitHub Pages. `.github/workflows/pages.yml` builds and deploys on every push to `main` and every night (for fresh stats). Every route gets its own `index.html`, so deep links work and have proper titles.

## Run locally

```sh
cd tools && npm install
npm test               # validate the catalog and test the search logic
npm run data:fast      # build web/public/data without fetching stats (npm run data fetches them)

cd ../web && npm install
npm start              # http://localhost:4200, reloads on save
```

To try the production build the way GitHub Pages serves it:

```sh
cd web && npx ng build --base-href /waitro/
node ../tools/src/spa-routes.mjs
cd ../tools && npm run preview -- --base /waitro/   # http://localhost:4300/waitro/
```

## Add or fix a model

See [CONTRIBUTING.md](CONTRIBUTING.md). Every model page also links to its file.
