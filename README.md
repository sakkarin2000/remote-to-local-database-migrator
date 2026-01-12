# Database Migrator

This project is a Next.js app for previewing and migrating MySQL tables from a remote source to a local destination.

Dev commands:

```bash
yarn install
yarn dev
yarn build
yarn lint
yarn format
```

Refactor notes:
- Centralized DB helpers in `lib/db`
- UI primitives in `app/components/ui`
- API helpers in `lib/api`
- Client hooks in `hooks/`
# remote-to-local-database-migrator
