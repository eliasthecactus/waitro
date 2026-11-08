// GitHub stars and Hugging Face downloads (last 30 days) for every model with those links.
// Called by build-data.mjs at build time; set GITHUB_TOKEN to avoid the low anonymous rate limit.

async function json(url, headers) {
  const res = await fetch(url, { headers: { 'user-agent': 'waitro-stats', ...headers }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

export async function fetchStats(models, { concurrency = 8 } = {}) {
  const gh = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
  const stats = {};
  const queue = [...models];
  async function worker() {
    while (queue.length) {
      const m = queue.shift();
      const s = {};
      const repo = m.links?.repo?.match(/^https:\/\/github\.com\/([^/]+\/[^/#?]+)/)?.[1];
      const hf = m.links?.weights?.match(/^https:\/\/huggingface\.co\/([^/]+\/[^/#?]+)/)?.[1];
      try {
        if (repo) {
          const r = await json(`https://api.github.com/repos/${repo}`, gh);
          Object.assign(s, { stars: r.stargazers_count, lastCommit: r.pushed_at.slice(0, 10) });
        }
        if (hf) {
          const r = await json(`https://huggingface.co/api/models/${hf}`);
          Object.assign(s, { downloads: r.downloads, likes: r.likes });
        }
      } catch (e) {
        console.warn(`stats ${m.id}: ${e.message}`);
      }
      if (Object.keys(s).length) stats[m.id] = s;
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return stats;
}
