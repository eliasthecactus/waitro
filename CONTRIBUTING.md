# Adding or fixing a model

Each model is one file, `data/models/<id>.yaml`, where `<id>` is lowercase-kebab-case. Copy an existing file of the same kind as a starting point (for example `relayvsr.yaml` for an open model, `claude-opus-5-5.yaml` for an API model).

Run `npm test` in `tools/` before opening a pull request. Unknown fields are errors, so typos get caught.

## Rules

- **Check facts against a primary source**: the model card, paper, repo or the vendor's pricing page. Don't copy numbers from blog posts.
- **Mark the authors' own numbers** with `selfReported: true` and link the source.
- **Only add `released`** when you can verify it, and say where it came from in `dateSource` (`vendor`, `paper`, `github` or `huggingface`).
- **Quote strings that contain commas** inside `[ ... ]` lists, or YAML splits them.
- **Be honest about limits**: licence restrictions, hardware, things that are new and unproven.

## Fields

Required: `id`, `name`, `org`, `summary` (max 200 characters), `tasks` (ids from `data/taxonomy.yaml`), `access` (`open-weights`, `api` or `both`), `license` (`id`, `commercial`: `yes`/`limited`/`no`/`unknown`, optional `note`), `io` (`in` and `out` data types, used for chaining), `links` (`repo`, `paper`, `weights`, `homepage`, `docs`, `pricing`, `demo`), `lastChecked`.

Optional: `released` + `dateSource`, `description`, `architecture`, `params` (`total`, `active`, in billions), `contextTokens`, `maxOutputTokens`, `scale`, `weightsSizeGB`, `pricing` (`inputPerM`, `outputPerM`, `cachedInputPerM`, `note`, `source`; required for API models), `hardware` (`platforms`, `minVramGB`, `note`), `variants`, `benchmarks`, `strengths`, `limitations`, `betterOptions`, `notes`, `tags`.

## Newer or better options

When a newer or more efficient model replaces an older one, add it to the older model's `betterOptions`:

```yaml
betterOptions:
  - id: relayvsr
    why: About 3.8× faster at 1080p with about 40% less peak VRAM, per the RelayVSR paper.
    aspects: [speed, memory]
```

The older model's page then shows it at the top, the table can hide replaced models, and the AI search prefers the newer one unless the person's constraints favour the old one. The newer model's page lists what it is recommended over.

## Top picks

`data/rankings/<task>.yaml` holds the editorial picks for a task. `rank` is optional: LLM picks are labelled by use case instead of numbered, because vendors measure benchmarks differently. Keep `updated` current when you change a ranking.
