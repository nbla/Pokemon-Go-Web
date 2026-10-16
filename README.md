# Pokémon GO Command Center – GitHub Pages

Static mobile-friendly site based on the existing Home Assistant v0.5 card.

## Deploy
1. Create a **public** GitHub repository, e.g. `pokemon-go-command-center`.
2. Upload `index.html` and `pokemon-go-card.js` to the repository root.
3. In Settings → Pages, choose **Deploy from a branch**, branch `main`, folder `/(root)`; save.
4. Visit `https://YOUR_USERNAME.github.io/pokemon-go-command-center/` once deployed.

No Home Assistant access or credentials are used. The browser fetches community JSON feeds directly from GitHub. If upstream data or browser CORS policy changes, some sections may stop working. The feed is unofficial and its accuracy is not guaranteed.

The card is derived from the user's v0.5, including their raid ordering. The static wrapper and layout are new; test on a phone after publishing.
