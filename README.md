# thelastplatform.com

The Last Platform: where worlds emerge. Static site, no build step.

## How it is put together

Everything served lives in `public/`:

- `emergences.js` is the manifest: what is in the chambers, plus the
  sign-up endpoint. It is empty: there are no worlds yet.
- `platform.js` builds the drum of chambers, keeps the liquid alive, lets a
  world engulf the screen when entered, and handles the sign-up form.
- `platform.css` is the frame: black, charcoal, white, silver, gold.
- `index.html` is the shell: boot sequence, console, send word.

## Place a world in a chamber

Add one object to `EMERGENCES` in `public/emergences.js` (the file documents
each field, including the world's own `feel` colours) and push. It takes the
next chamber. It is addressable at `thelastplatform.com/#<id>`.

To see how a world sits, wakes and engulfs without adding one, open
`thelastplatform.com/?specimen`. That places two test worlds, only for
whoever uses that address. `?noboot` skips the boot sequence.

## Sign-up

`PLATFORM.signup` in `public/emergences.js` holds the Formspree endpoint.

## Deploy

Cloudflare Workers static assets, connected to this repo. `wrangler.jsonc`
serves `public/`. Every push to `main` goes live.
