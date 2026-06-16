# Meme Studio assets

Drop your own images here, then run `npm run meme-studio:reindex` to
regenerate the manifests (or edit the `manifest.json` files by hand).

## Faces — `faces/<leaderId>/`

Put leader photos (transparent-background PNG cut-outs work best) into a
folder named after the leader, e.g.:

```
faces/jagan/smiling.png        # YS Jagan Mohan Reddy (YSRCP)
faces/jagan/serious.png
faces/naidu/worried.png        # Chandrababu Naidu (TDP)
faces/pawan/laughing.png       # Pawan Kalyan (Janasena)
faces/bjp/neutral.png          # BJP figure
```

The file name (minus extension) is used as the default expression tag.

`faces/manifest.json` shape:

```json
{
  "leaders": [
    {
      "leaderId": "jagan",
      "name": "YS Jagan Mohan Reddy",
      "party": "ysrcp",
      "photos": [{ "file": "smiling.png", "expression": "smiling" }]
    }
  ]
}
```

## Stickers / symbols / illustrations — `assets/<category>/`

Categories: `symbols`, `bubbles`, `stickers`, `stamps`, `banners`.

```
assets/symbols/ysrcp-fan.png
assets/symbols/tdp-cycle.png
assets/stickers/vs.png
assets/stamps/fail.png
```

`assets/manifest.json` shape:

```json
{
  "assets": [
    { "id": "ysrcp-fan", "category": "symbols", "file": "ysrcp-fan.png", "tags": ["ysrcp", "fan", "symbol"] }
  ]
}
```
