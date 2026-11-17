# Releasing

## Versioning

Semantic Versioning: `MAJOR.MINOR.PATCH`. Before 1.0, breaking changes may ship in
minor releases, but call them out in the changelog.

## Checklist

1. Ensure `main` is green: `npm test`, `npm run lint`, `npm run build`.
2. Update `CHANGELOG.md` and move items out of `Unreleased`.
3. Bump `version` in `package.json`.
4. Commit: `Release vX.Y.Z`.
5. Tag: `git tag vX.Y.Z && git push origin main --tags`.
6. GitHub Actions deploys the new build to GitHub Pages automatically.
7. Verify https://yx0128.github.io/evergrow/ loads and assets return 200.
8. Create a GitHub Release from the tag using the changelog entry.

## Rollback

Revert the release commit on `main` and push; Pages redeploys the previous build.
For an urgent static rollback, re-run the deploy workflow from an older commit.

## Ownership

Release manager: **[TO BE DECIDED]**.
