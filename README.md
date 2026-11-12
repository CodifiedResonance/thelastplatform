# thelastplatform.com

Studio site for The Last Platform. One static page, no build step.

## Deploy

Cloudflare Workers (static assets), connected to this repo. `wrangler.jsonc`
tells Cloudflare to serve everything in `public/`. The deploy command is
`npx wrangler deploy`; there is no build step.

Every push to `main` goes live.

## Editing

Everything is in `public/index.html`. The `SITE` object near the bottom holds the
links that switch on as things go live:

- `humans` / `machines`: where the two Builder doors lead
- `founding`: the Stripe payment link for founding access. While empty, the
  button reads "Founding access opens soon".

Prices and stronghold numbers are in the "Founding access" section markup.
