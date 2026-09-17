# Contributing

How we work on this repo.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <summary>
```

- Imperative mood (`fix`, not “fixed”)
- One logical change; short summary
- Optional body explains why
- Close issues with `Fixes #12`

**Types:** `feat` `fix` `refactor` `perf` `test` `docs` `chore` `ci`

**Scopes:** `app` `api` `agent` `live-tutor` `feed` `library` `study-tools` `gamification` `auth` `android` `ios` `deploy` `landing`

```text
fix(app): stop hardcoding live minutes in header wallet
feat(study-tools): fall back to YouTube audio transcription
```

## Branches

```text
fix/12-header-live-minutes
feat/45-offline-mode
chore/bump-0.2.5
```

## Issues

Use the Bug or Feature form. One issue = one problem. Bugs need steps to reproduce.

## Pull requests

- Fill the PR template and link `Fixes #N`
- Keep PRs small and focused
- Squash-merge using a Conventional Commit subject
- Never commit secrets (`.env.local`, keystores, API keys)
