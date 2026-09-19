# Contributing

Thanks for contributing to `erp-boilerplate`.

## Ground rules

- Be respectful and follow our [Code of Conduct](./CODE_OF_CONDUCT.md).
- Use [GitHub Issues](https://github.com/TheMisterPin/erp-boilerplate/issues) for bugs/features and include the requested template details.
- **Do not report security vulnerabilities in public issues**. Follow [SECURITY.md](./SECURITY.md).

## Local setup

This repository uses **pnpm**, **Next.js**, **Prisma**, and **PostgreSQL**.

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy env template and configure local values:

   ```bash
   cp .env.example .env
   ```

3. Generate Prisma client and apply migrations:

   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

4. Seed demo data:

   ```bash
   pnpm db:seed
   ```

5. Start development server:

   ```bash
   pnpm dev
   ```

## Validate your change before opening a PR

Run checks that match repository scripts:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If your change touches database schema or seeded data, also verify:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Architecture expectations

Follow the feature architecture and shared systems described in:

- [README.md](./README.md)
- [`.docs/components/architecture.md`](./.docs/components/architecture.md)
- [`.docs/components/list-pages.md`](./.docs/components/list-pages.md)

Key expectations:

- Keep routes thin (`app/` route pages wire hook output into stateless feature views).
- Reuse shared systems (`forms`, `modals`, `errors`, `tables`) instead of adding parallel stacks.
- Keep server/client boundaries intact (`actions` stay server-side, UI logic in feature hooks/components).

## Pull request checklist

Every PR should include:

- Problem statement and summary of the approach.
- Reproduction steps (for bug fixes) and acceptance criteria.
- Test plan and test results (`pnpm lint`, `pnpm typecheck`, `pnpm test`, and any targeted/manual checks).
- Migration notes if Prisma schema/migrations changed.
- Documentation impact (`README`, `.docs`, or template updates if applicable).

Use the pull request template to ensure nothing is missed.
