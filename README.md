# thelastplatform.com

Studio site for The Last Platform. One static page, no build step.

## Deploy

Cloudflare Pages, connected to this repo:

- Framework preset: None
- Build command: (empty)
- Build output directory: `/`
- Production branch: `main`

Every push to `main` goes live. Other branches get preview URLs.

## Editing

Everything is in `index.html`. The `SITE` object near the bottom holds the
links that switch on as things go live:

- `humans` / `machines`: where the two Builder doors lead
- `founding`: the Stripe payment link for founding access. While empty, the
  button reads "Founding access opens soon".

Prices and stronghold numbers are in the "Founding access" section markup.
