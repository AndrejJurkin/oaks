# oaks

TypeScript project.

```sh
pnpm install
pnpm start          # run src/index.ts
pnpm challenge      # run the code-challenge harness
pnpm tsx file.ts    # run any .ts file
pnpm test           # unit tests (vitest)
pnpm typecheck
```

Module resolution is `Bundler` so the provided challenge harness can import `./code-challenge` without an extension. Everything runs through tsx/vitest, and `pnpm build` output is not runnable with plain Node.
