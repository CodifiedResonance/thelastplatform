# thelastplatform.com

The Last Platform: where worlds emerge. Static site, no build step.

## How it is put together

Everything served lives in `public/`:

- `emergences.js` is the manifest: what is in the chambers, plus the
  sign-up endpoint. It is empty: there are no worlds yet.
- `platform.js` runs the drum (turning, waking, entering a world), the boot
  sequence and the insert form. It also holds a flat version of the chambers,
  used only where WebGL is missing.
- `chambers3d.js` draws the chambers in 3D with three.js: refracting glass,
  liquid, bubbles, metal, floor. three.js is vendored in `vendor/`, so
  nothing loads from a CDN.
- `platform.css` is the frame: black, charcoal, white, silver, gold.
- `index.html` is the shell: boot sequence, console, insert.

## Place a world in a chamber

Add one object to `EMERGENCES` in `public/emergences.js` (the file documents
each field, including the world's own `feel` colours) and push. It takes the
next chamber. It is addressable at `thelastplatform.com/#<id>`.

To see how a world sits, wakes and engulfs without adding one, open
`thelastplatform.com/?specimen`. That places two test worlds, only for
whoever uses that address. `?noboot` skips the boot sequence.

## Insert

People insert a location where they can be reached. `PLATFORM.signup` in
`public/emergences.js` holds the Formspree endpoint it goes to.

## Deploy

Cloudflare Workers static assets, connected to this repo. `wrangler.jsonc`
serves `public/`. Every push to `main` goes live.
