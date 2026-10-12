This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Session refresh

`proxy.ts` restores missing or expired access tokens on protected routes using
`POST /auth/refresh`. Customer (`access_token`, `bb_user_rt`) and dashboard
(`d_token`, `bb_dashboard_rt`) credentials are kept separate. Refreshed JWTs are
signature- and role-checked before the request proceeds. Dashboard storefront
selection forwards its refresh cookie so subsequent refreshes retain the selection;
logout revokes that refresh session as well as clearing local cookies.

Refresh cookies are HttpOnly, SameSite=Strict, host-only, and Secure in production.
Use HTTPS in production. Next.js relays only the selected refresh credential to the
configured, trusted `BACKEND_URL`, with the backend's required CSRF header; refresh
requests are not cached and do not follow redirects. Public dashboard sign-in stays
public and does not automatically refresh a session.

Existing dashboard sessions need one new sign-in after deployment, because earlier
versions did not retain the backend refresh cookie.

**Deployment limitation:** concurrent refreshes are coalesced only within one
Next.js process. The backend treats reuse of a rotated token within 60 seconds as
compromise and revokes all sessions for that user. Multiple processes/replicas or
serverless invocations therefore need shared refresh coordination before enabling
this flow across them; sticky sessions alone do not cover restarts. After an
ambiguous network failure, a process blocks replay for 65 seconds, but cannot
recover a rotated credential whose response was lost. This implementation does
not change those backend semantics.

Run the proxy/refresh regression suite with:

```bash
bun test proxy.test.ts
```

The tests use real ES256 JWTs with a mocked backend; they do not replace a live
backend/browser integration test.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
