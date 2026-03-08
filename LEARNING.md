# Vyapar Sahayak -- Deployment & Development Learnings

Everything we hit, fixed, and learned while building and deploying this app.
Read this before touching deployment, Prisma, Amplify, or Turso config.

---

## Project Architecture

- **Monorepo layout**: App lives in `vyapar-sahayak/` subdirectory, not repo root
- **Stack**: Next.js (SSR) + Prisma + Turso (LibSQL) + AWS Bedrock (Nova Lite) + Amplify
- **Database**: Turso cloud SQLite at `REDACTED_TURSO_URL`
- **Prisma output**: Custom path `../src/generated/prisma` (not default `node_modules`)
- **DB client**: Uses `@prisma/adapter-libsql` with `PrismaLibSql({ url, authToken })`

---

## AWS Amplify Deployment

### Amplify requires three things for Next.js SSR

1. **Platform = `WEB_COMPUTE`** (not `WEB` which is static-only)
   ```bash
   aws amplify update-app --app-id <id> --platform WEB_COMPUTE
   ```
2. **Branch framework = `Next.js - SSR`**
   ```bash
   aws amplify update-branch --app-id <id> --branch-name main --framework "Next.js - SSR"
   ```
3. **Build spec** must output `.next` artifacts (see `amplify.yml` at repo root)

Missing any of these gives you either a 404 or a build error saying
"Please update your app's framework to 'Next.js - SSR'".

### Monorepo configuration

- Set `AMPLIFY_MONOREPO_APP_ROOT=vyapar-sahayak` as an Amplify environment variable
- `amplify.yml` must be at **repo root** (not inside the app subdirectory)
- Use `appRoot: vyapar-sahayak` in amplify.yml so build commands run in the right directory

### amplify.yml -- the working version

```yaml
version: 1
applications:
  - appRoot: vyapar-sahayak
    frontend:
      phases:
        preBuild:
          commands:
            - npm install
            - npx prisma generate
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - "**/*"
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
```

### Amplify env var gotchas

- **Cannot use `AWS_` prefix** for environment variables. Amplify reserves that namespace.
  - `AWS_REGION` won't work. Use a custom name like `BEDROCK_REGION` instead.
  - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` can't be set either. Use IAM roles for compute instead.
- Use `npm install` not `npm ci` -- Amplify's build environment sometimes has lock file version mismatches that cause `npm ci` to fail with `EUSAGE` errors.

### Manual deploy = static only

Creating an Amplify app via `aws amplify create-app` and using manual deploy gives you
a `WEB` (static) app. For SSR you must connect to a Git repo (GitHub, etc.) so Amplify
can build and deploy the compute layer.

---

## Prisma + Turso

### Schema drift -- the #1 bug source

**The problem**: Local `dev.db` had columns that weren't in `schema.prisma`. The local
Prisma client was generated from the local database, so local builds passed fine.
On Amplify, `prisma generate` ran fresh from the committed schema, exposing every
missing field as a TypeScript error.

**Fields that were missing from schema.prisma but existed in local dev.db**:
- `Campaign.posterUrlAlt`, `Campaign.orderLink`
- `Order.notes`, `Order.campaignId`
- Entire models: `WhatsAppGroup`, `Order`, `OrderItem`, `DispatchBatch`, `DispatchBatchOrder`

**Lesson**: Always run `npx prisma generate` from a clean state before pushing.
If the build passes locally with `npx prisma generate && npx tsc --noEmit`, it'll
pass on Amplify. Don't trust builds that use a stale generated client.

### `prisma db push` doesn't work with `libsql://` URLs

Prisma's `db push` command doesn't support Turso's `libsql://` protocol directly.

**Workaround for full schema sync**:
1. Push to a local temp SQLite file: `DATABASE_URL=file:./temp.db npx prisma db push`
2. Extract the schema: `sqlite3 temp.db .schema`
3. Pipe to Turso: `turso db shell <db-name> < schema.sql`

**Workaround for individual columns**:
```bash
turso db shell vyapar-sahayak --auth-token $TOKEN \
  "ALTER TABLE Campaign ADD COLUMN posterUrlAlt TEXT;"
```

### Nullable fields and TypeScript

If a Prisma field is `DateTime?` (nullable), TypeScript will complain about
`.toISOString()` calls. Always use optional chaining:
```typescript
b.plannedDate?.toISOString() || null
```
Update your TypeScript interfaces to match: `plannedDate: string | null`

### Campaign has no `orders` relation

Campaign and Order are linked by `Order.campaignId` (a plain string field),
not by a Prisma relation. You can't do `campaign.findMany({ include: { orders: true } })`.

Instead, query orders separately:
```typescript
const campaigns = await prisma.campaign.findMany({ where });
const campaignIds = campaigns.map((c) => c.id);
const orders = await prisma.order.findMany({
  where: { campaignId: { in: campaignIds } },
});
// Then match them up manually
const campaignOrders = orders.filter((o) => o.campaignId === c.id);
```

---

## Environment Variables

### What's set on Amplify

| Variable | Value | Notes |
|----------|-------|-------|
| DATABASE_URL | `REDACTED_TURSO_URL` | Turso cloud URL |
| TURSO_AUTH_TOKEN | (token) | JWT for Turso auth |
| BEDROCK_TEXT_MODEL | `amazon.nova-lite-v1:0` | Nova Lite for chat |
| BEDROCK_REGION | `us-east-1` | Bedrock endpoint region |
| CHAT_USE_BEDROCK | `true` | Use Bedrock for chat API |
| AMPLIFY_MONOREPO_APP_ROOT | `vyapar-sahayak` | Monorepo app directory |

### What's NOT set (needs fixing)

- **Bedrock IAM credentials**: Can't use `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` as env vars (AWS_ prefix blocked). Need to attach an IAM role to the Amplify compute environment instead.
- **NEXT_PUBLIC_BASE_URL**: Should be `https://main.d3odh0mbro0ew1.amplifyapp.com` for generating order links.
- **GOOGLE_CLOUD_API_KEY**: Not set on Amplify yet.

---

## Deployment Details

- **Amplify App ID**: `d3odh0mbro0ew1`
- **Region**: `ap-south-1`
- **Domain**: `https://main.d3odh0mbro0ew1.amplifyapp.com`
- **GitHub repo**: `CrypticCortex/VyaparSahayak` (main branch)
- **IAM user**: `vyapar-bedrock` (needed Amplify permissions added manually)

---

## Build Failure History (for pattern recognition)

| Build | Error | Root Cause | Fix |
|-------|-------|-----------|-----|
| 1 | `npm ci EUSAGE` no package-lock | `AMPLIFY_MONOREPO_APP_ROOT` not set, ran at repo root | Added env var + moved amplify.yml to root |
| 2 | `picomatch version mismatch` | `npm ci` strict lock check | Changed to `npm install` |
| 3 | `posterUrlAlt not in Campaign` | Field missing from schema.prisma | Added to schema + ALTER TABLE on Turso |
| 4 | `campaignId not in Order` | Field missing from schema.prisma | Added to schema + ALTER TABLE on Turso |
| 5 | `plannedDate possibly null` | Nullable DateTime used without `?.` | Added optional chaining + fixed types |
| 5 (cont) | `Campaign.orders include` | No orders relation on Campaign | Queried orders separately by campaignId |
| 6 | 404 on deployed URL | Platform was `WEB` not `WEB_COMPUTE` | `update-app --platform WEB_COMPUTE` |
| 7-8 | Framework error | Branch not set to SSR | `update-branch --framework "Next.js - SSR"` |

---

## Quick Reference Commands

```bash
# Check Amplify build status
aws amplify list-jobs --app-id d3odh0mbro0ew1 --branch-name main --region ap-south-1

# Trigger a new build
aws amplify start-job --app-id d3odh0mbro0ew1 --branch-name main --job-type RELEASE --region ap-south-1

# Update Amplify env vars
aws amplify update-app --app-id d3odh0mbro0ew1 --environment-variables KEY=value --region ap-south-1

# Run Turso SQL
turso db shell vyapar-sahayak "SELECT COUNT(*) FROM Distributor;"

# Validate schema locally before pushing
cd vyapar-sahayak && npx prisma generate && npx tsc --noEmit

# Seed the deployed database
curl https://main.d3odh0mbro0ew1.amplifyapp.com/api/seed
```

---

## What's Left To Do

1. Verify Build 9 succeeds and site loads
2. Seed the Turso database via `/api/seed`
3. Fix Bedrock credentials (IAM role for Amplify compute, not env vars)
4. Set `NEXT_PUBLIC_BASE_URL` and `GOOGLE_CLOUD_API_KEY` on Amplify
5. Test all features end-to-end on the deployed URL
