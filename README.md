## Glass workshop demo

The current homepage is a standalone glass shader prototype. Run `bun dev`
locally; build the demo with `SKIP_ENV_VALIDATION=1 bun run build`.
The Vercel production project is `vortes-projects/preludelabs-assignment`.
Its `SKIP_ENV_VALIDATION=1` setting allows this visual demo to build without
the unused starter database and Clerk credentials; authenticated starter
routes still require the credentials described below.

In DialKit, **Exploded cube → Hold Expanded** keeps the cube open while
tuning. Disable it to restore navbar hover behavior. Shader selection follows
the list order, and leaving during a turn settles the rotation before collapse.

# T3 + Neon + Clerk Starter

A minimal, production-shaped T3 starter using Next.js, tRPC, Tailwind CSS,
Prisma, Neon Postgres, Clerk authentication, and Bun. The included protected
CRUD screen is an end-to-end smoke test and can be replaced when your product
work begins.

## Create a project

Use **Use this template** on GitHub, or run:

```bash
gh repo create <project-name> \
  --private \
  --template Vortes/t3-neon-clerk-starter \
  --clone
```

Then rename the package and page metadata for the new product.

## Local setup

1. Create a Neon project with `production`, `staging`, and `development`
   branches.
2. Create separate Clerk applications for production and staging. Use the
   development instance of the staging application for preview deployments.
3. Copy `.env.example` to `.env` and add development credentials.
4. Install dependencies and initialize the database:

```bash
bun install
bun run db:push
bun run dev
```

## Deployment environments

Configure these variables in Vercel for each environment:

- `DATABASE_URL`: Neon pooled connection string
- `DIRECT_URL`: Neon direct connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: matching Clerk publishable key
- `CLERK_SECRET_KEY`: matching Clerk server secret

Use the Neon `staging` branch and staging Clerk app for Vercel Preview. Use the
Neon `production` branch and Clerk production instance for Vercel Production.
Never copy production credentials into Preview or local development.

Connect the repository to Vercel, map the Git `staging` branch to Preview, and
deploy `main` to Production only after the Clerk production domain is verified.
