---
name: qmd markdown search integration
about: Integrate qmd as a local CLI search engine for docs/knowledge base
title: 'feat: integrate qmd for markdown document search'
labels: enhancement
assignees: ''
---

**Is your feature request related to a problem?**
As the project's documentation base grows (engine reference docs, ADRs, GDDs, skill files, sprint logs), agents spend increasing context and time searching through plain markdown. The project needs a fast, local, agent-friendly search layer that doesn't require shipping content to external APIs.

**Describe the solution you'd like**

Integrate [qmd](https://github.com/tobi/qmd) (Query Markup Documents) — a mini CLI search engine purpose-built for markdown knowledge bases:

1. **Installation** — Add `@tobilu/qmd` as a dev dependency (npm or bun global install).
2. **Indexing** — Run `qmd index` across key doc directories (`docs/`, `.opencode/agents/`, `.opencode/skills/`, `design/`, `production/`) via a script or pre-commit hook.
3. **Skill / command** — Create an `.opencode/skills/qmd-search/SKILL.md` skill that teaches agents to use:
   - `qmd search "..."` for fast BM25 keyword search
   - `qmd vsearch "..."` for semantic vector search
   - `qmd query "..."` for hybrid (FTS + vector + re-ranking) best-quality search
4. **Context hook integration** — Wire into the `ccgs-hooks.ts` plugin so relevant doc snippets are auto-retrieved as session context when an agent loads.
5. **CI freshness check** — Add a GitHub Action step that validates the qmd index is up-to-date with the doc tree.

**Describe alternatives you've considered**

- **ripgrep / grep** — Fast but no ranking, no semantic search, no relevance scoring.
- **WebFetch for docs** — Requires network, doesn't work for local/private docs.
- **Context7 MCP** — Good for external libraries, not for project-internal docs.
- **Rolling our own FTS** — qmd already bundles BM25 + sqlite-vec embeddings + query expansion + re-ranking in a single CLI. No need to reinvent.

**Additional context**

qmd is authored by tobi (Tobi L.) — well-maintained, MIT-licensed, 24k+ stars. It stores its index in SQLite (FTS5 + sqlite-vec), is fully local, and has no external API dependencies. The `.claude-plugin/` directory in the qmd repo suggests it was designed with AI agent integration in mind.
