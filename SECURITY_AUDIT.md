# Security Audit — API Key Exposure

**Date:** 2026-07-19
**Scope:** Full working tree + complete git history (all branches) for hardcoded API keys.
**Key values are redacted** to first-4…last-4 characters throughout.

## Summary

API keys for Google Gemini and OpenAI Whisper were hardcoded in source and later
committed inside a `.env` file. All secrets have now been **purged from git history**
(local and remote `origin`) via `git-filter-repo`, and `.env` has been removed from
every commit. Because the pre-purge history was already pushed to GitHub, the exposed
values must be treated as **compromised** — see [Required follow-up](#required-follow-up).

## Secrets exposed in pre-purge history

Three distinct secrets appeared in history. Commit hashes below are the **pre-purge**
hashes (history has since been rewritten, so these SHAs no longer exist in the repo).

| Secret (redacted) | Where it was hardcoded / committed | Pre-purge commit |
|---|---|---|
| Gemini `AIza…gl8I` | `services/GeminiService.tsx` — `const GEMINI_API_KEY = "…"` | `d544ac9` (added), `528f0ab` (removed/refactored to env) |
| OpenAI `sk-p…_KEA` | `services/transcribeAudioWithWhisper.tsx` — `Authorization: "Bearer …"` | `46fa48d` (added), `528f0ab` (removed/refactored to env) |
| Gemini `AIza…6YWg` + OpenAI `sk-p…_KEA` | `.env` file committed to the repo | `cd1e2b9` (added), `211b2f9` (untracked) |

Notes:
- The Gemini key `AIza…6YWg` is the **current live key** still in the local `.env`. It was
  exposed via the committed `.env` and **must be rotated**.
- The OpenAI key `sk-p…_KEA` was exposed in two places (hardcoded + committed `.env`).
- The **current live OpenAI key `sk-p…T6gA` was never present in git history** — it does
  not appear in any historical blob. It is not history-exposed, though rotating it is still
  reasonable given the overall incident.

## Working tree (current state)

- **Clean.** No hardcoded key literals remain in tracked source. The only `sk-` match in the
  tree is `queue-microtask` inside `package-lock.json` (a false positive, not a key).
- `services/GeminiService.tsx` and `services/transcribeAudioWithWhisper.tsx` both import their
  keys from `config/env.ts`, which reads `EXPO_PUBLIC_GEMINI_API_KEY` /
  `EXPO_PUBLIC_OPENAI_API_KEY` from `process.env` with **no hardcoded fallback**.
- `.env` is gitignored and untracked; it is **absent from all git history** after the purge.

## Remediation performed

1. **Full mirror backup** taken before any rewrite (kept outside the repo).
2. `git filter-repo` run with:
   - regex `--replace-text` rules scrubbing any `AIza…` (Google) and `sk-…` (OpenAI) token to
     a `***REMOVED_*_KEY***` marker across every blob;
   - `--path .env --invert-paths` to delete the `.env` file from all history.
3. **Verified:** 0 `AIza…`/`sk-…` key matches remain in `git log --all -p`; `.env` no longer
   appears in `git log --all -- .env`.
4. **Force-pushed** rewritten `main` and `Testing` to `origin` (GitHub). Local and remote
   heads match the purged commits.

## Required follow-up

- [ ] **Rotate the Gemini key `AIza…6YWg`** (Google AI Studio / Cloud console) — it was in
      pushed history and any pre-purge clone still contains it.
- [ ] **Rotate the older OpenAI key `sk-p…_KEA`** if it is still active anywhere (it was
      exposed; the current `sk-p…T6gA` supersedes it locally).
- [ ] Consider rotating the current OpenAI key `sk-p…T6gA` as defense-in-depth (not strictly
      required — never in history).
- [ ] After rotating, update the local `.env` with the new values.
- [ ] Anyone who cloned the repo before this purge should **delete and re-clone**; their old
      clone still contains the leaked keys in its local history.

## Structural limitation (not a regression)

The keys are exposed to the client as `EXPO_PUBLIC_*` environment variables, so they are
**bundled into the built app** and readable by anyone who inspects the shipped binary. This is
inherent to calling Gemini/OpenAI directly from the React Native client. The secure long-term
fix is to proxy these API calls through a backend that holds the keys server-side. This is
noted as future work and is out of scope for the current cleanup.
