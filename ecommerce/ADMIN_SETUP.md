# Aura admin panel

Start the project with `npm start` from the repository root (or with `npm start` from `ecommerce`). Open `/admin-login.html` to sign in.

## Configure administrator access

The server requires both `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Set them in the server process environment using your local environment or deployment secret manager, then restart the server. Do not commit credentials or put them in browser JavaScript.

For example, in PowerShell, use a credential prompt and start the server in the same terminal:

```powershell
$admin = Get-Credential -UserName "admin@example.com"
$env:ADMIN_EMAIL = $admin.UserName
$env:ADMIN_PASSWORD = $admin.GetNetworkCredential().Password
npm start
```

If either variable is absent, sign-in returns a clear configuration error; there is no default account or frontend password.

Successful sign-ins use an eight-hour, server-side session and an `HttpOnly`, `SameSite=Strict` cookie. Sessions are held in server memory and are invalidated when the server restarts. In production, serve the site over HTTPS and set `NODE_ENV=production` so the session cookie is marked `Secure`.

## Demo data and production integration

This project has no product/order database, customer service, or payment-provider integration. Admin product edits and demo checkout orders are stored in the current browser's `localStorage`; they are not shared between browsers and are not durable server records. Product edits are also read by the storefront in that browser. Customer counts represent distinct recorded order email addresses, not all registered accounts.

Order totals are not reported as revenue. Checkout records remain unconfirmed until a payment integration supplies verified payment data; changing fulfilment status does not change payment status. Any future integration must map a trusted server-verified payment to `paymentStatus: "paid"` and `paymentConfirmed: true` before it can be treated as confirmed.

Before using the panel for a live store, replace the demo storage in `js/admin-service.js` with authenticated server APIs, enforce authorization and validation on those APIs, connect inventory and orders to the database, and use payment-provider webhooks or an equivalent trusted server-side verification flow for payment status and revenue.
