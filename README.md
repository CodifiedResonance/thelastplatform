# thelastplatform.com

The Last Platform: where worlds emerge. Static site, no build step.

## How it is put together

Everything served lives in `public/`:

- `emergences.js` is the manifest: the list of worlds on the platform, plus
  the sign-up endpoint. The page is drawn from it.
- `platform.js` draws the rail from the manifest, times the light that
  travels down it, and handles the sign-up form.
- `platform.css` is the platform's own frame, with one block per world's
  mark at the bottom.
- `index.html` is the shell: threshold, rail, how it holds, send word.

## Bring a world onto the platform

1. Add one object to `EMERGENCES` in `public/emergences.js` (the file
   documents each field). Order is the order they emerged.
2. If the world has its own wordmark, add a `.mark-<style>` block to the
   bottom of `platform.css` and name it in the world's `mark.style`.
   Without one it gets the plain treatment.
3. Push.

Each world is addressable at `thelastplatform.com/#<id>`. A door with an
empty `href` shows as "not yet open"; fill it in when the door opens.

## Sign-up

Set `PLATFORM.signup` in `public/emergences.js` to the Formspree endpoint
(`https://formspree.io/f/...`). While it is empty the page says the list is
not open yet and draws no form.

## Deploy

Cloudflare Workers static assets, connected to this repo. `wrangler.jsonc`
serves `public/`. Every push to `main` goes live.
