# Contributing to 0-0

Thanks for your interest. 0-0 is in early development, so issues that describe a real use case are as valuable as code.

## Getting set up

You need Node 22 and npm.

```sh
npm ci
npm run dev
```

Before opening a pull request, make sure these pass:

```sh
npm run lint
npm test
npm run build
```

## Guidelines

- **Keep the core dependency-free.** Runtime code in `src/` must not add npm dependencies. Dev tooling is fine.
- **Keep scheduling pure.** `src/engine/interval-index.ts` and `src/engine/scheduler.ts` must not touch the DOM, so they stay testable in Node.
- **Test what you change.** Unit tests live in `test/`; DOM tests opt into jsdom with `// @vitest-environment jsdom`.
- **Accessibility is a feature.** New elements use native controls, have accessible names, work with the keyboard, and do not add live regions unless the content is rare and important.
- **Cue format changes need a document.** Update `docs/cue-format.md`, and add a decision record in `docs/decisions/` for anything that is not backwards compatible.
- **Media must be yours.** Only commit media you created or that is clearly licensed for reuse; the demo uses synthetic media only.
- **Record changes.** Add a line under "Unreleased" in `CHANGELOG.md`, and tick the matching item in `ROADMAP.md` if there is one.

## Adding an element type

1. Write a plugin (see `src/elements/link.ts` for a transient element and `src/elements/chapters.ts` for a persistent one).
2. Add a payload validator so bad cue data fails with a clear message.
3. Register it in `src/elements/registry.ts` if it should be built in.
4. Document its `data` fields in `docs/cue-format.md` and add tests.

## Reporting bugs

Please include the browser, a minimal cue document, and what you expected to see. Do not attach media you do not have the rights to share.

## License

By contributing you agree that your contributions are licensed under the MIT License.
