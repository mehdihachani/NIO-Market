# NIO Market — Commercial SaaS Release 1.7.0

NIO Market is a multi-tenant Algerian e-commerce SaaS. It is designed to sell **one hosted store per customer with a one-time purchase**, not to distribute source code.

## Commercial purchase flow

1. Customer opens `/buy`.
2. Customer enters full name, login email, store name and requested slug.
3. Customer pays using the platform owner's displayed CCP/RIP / BaridiMob details.
4. Customer uploads a payment proof (PDF/JPG/PNG/WEBP, max 5MB).
5. Owner/Admin reviews the proof at `/admin/purchases`.
6. On approval, NIO Market creates exactly one Merchant account and exactly one Store.
7. The system generates a strong temporary password and stores only its hash.
8. If `RESEND_API_KEY` and `EMAIL_FROM` are configured, credentials are sent automatically to the customer's email.
9. If email delivery is not configured, the generated password is returned once to the approving Admin so it can be delivered securely to the customer.
10. Customer can change the password from `/admin/security` after login.

## Payment contact shown on the public purchase page

- Name: Mehdi HACHANI
- RIP: 00799999002637845657
- CCP: 002637845657
- Address: 66 Saïd Touati Bab El Oued
- Email: mehdi-hachani@outlook.fr
- WhatsApp: +213771089064

These are displayed as the business payment/contact details requested by the platform owner. Change them in `app/buy/page.tsx` if the receiving details change.

## Tenant model

- One Merchant account owns exactly one Store (`Store.merchantId` is unique).
- Merchant APIs resolve the single store by the authenticated merchant relation.
- Owner/Admin can manage all stores.
- Store data, products, orders, customers and delivery rates remain tenant-scoped.

## First production setup

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run build
npm start
```

For an existing production database, review Prisma migration strategy before using `db push`.

Then visit `/setup` once to create the first OWNER. Rotate/remove `BOOTSTRAP_SECRET` after setup.

## Email delivery

Recommended environment variables:

```env
RESEND_API_KEY="..."
EMAIL_FROM="NIO Market <noreply@your-verified-domain.com>"
```

The sender domain must be verified with the email provider. Without these variables the purchase approval still works, but the Admin receives the temporary password once so it can be communicated manually.

## Payment proof storage

Payment proofs are stored outside `public/` and are only served through an authenticated Owner/Admin endpoint.

```env
PAYMENT_PROOF_DIR="./private/payment-proofs"
```

Production Docker uses a persistent volume at `/data/payment-proofs`. For multi-instance deployments, replace this local volume with a private object-storage adapter before scaling horizontally.

## Production Docker

```bash
docker compose -f docker-compose.production.yml up -d --build
```

Set all required environment variables first, especially `POSTGRES_PASSWORD`, `DATABASE_URL`, `AUTH_SECRET`, `BOOTSTRAP_SECRET`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY` and `EMAIL_FROM`.

## Security

- Passwords use salted `scrypt` hashes.
- Session cookies are signed, HttpOnly and SameSite.
- Session version invalidates old sessions after password changes.
- Public purchase endpoint is rate-limited.
- Payment proofs are private.
- Admin/Owner-only approval endpoints are authenticated.
- Tenant queries are scoped to the authenticated merchant store.
- Audit logs record purchase approvals/rejections and key account events.

## Still required before a serious multi-server launch

- Redis-backed distributed rate limiting.
- Automated PostgreSQL and object-storage backups.
- Monitoring/error tracking.
- CI/CD and integration/E2E tests.
- Real courier API adapters after official credentials/API documentation are available.
- Production Meta CAPI testing and event deduplication.
- DNS/SSL/reverse proxy configuration.
- Private object storage if more than one application instance is used.

## Final production checklist

Before opening sales to customers, set real production values for:

- `DATABASE_URL`
- `AUTH_SECRET` (32+ random characters)
- `APP_ENCRYPTION_KEY` (32+ random characters)
- `BOOTSTRAP_SECRET` (24+ random characters, then rotate/remove after first owner creation)
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY` and `EMAIL_FROM` if automatic credential emails are desired
- `STORE_PURCHASE_PRICE_DZD` and `NEXT_PUBLIC_STORE_PURCHASE_PRICE_DZD`
- `META_GRAPH_API_VERSION` only if Meta CAPI is used

Create the first Owner at `/setup`, then remove or rotate the bootstrap secret.

### PostgreSQL backups

Use the included scripts from a host with PostgreSQL client tools:

```bash
DATABASE_URL="..." ./scripts/backup-postgres.sh
./scripts/restore-postgres.sh ./backups/nio-market-YYYYMMDDTHHMMSSZ.sql.gz
```

For real production, schedule backups outside the application container and periodically test restores.

### One-time purchase model

A customer buys one store once. There is no automatic monthly subscription charge. The stored plan/status fields are platform controls for feature limits and store activation, not recurring billing.

### Delivery

NIO Market does not force a courier. Each Merchant can configure their own courier API credentials from the Delivery page. Wilaya/commune and delivery fees remain managed by NIO Market. A courier's actual API endpoints and payloads must be configured according to that courier's official documentation.


## Interface separation
- Owner/Admin console: `/admin` and `app.nio-market.com`
- Merchant workspace: `/dashboard`
- A Merchant is redirected away from `/admin` and cannot access Owner/Admin routes.
- Owner/Admin is redirected away from `/dashboard`.
- Merchant navigation is responsive for mobile and desktop.
