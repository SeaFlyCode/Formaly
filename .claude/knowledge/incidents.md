---
project: Formaly
tags: [Formaly, incidents]
---

> Parent : [[Formaly]]

# Incidents — Formaly

Historique des bugs rencontrés, root causes et fix. Ordre chronologique inverse (plus récent en haut).

## Format

```markdown
## YYYY-MM-DD — Titre court
**Symptôme** : ce qu'on observait
**Root cause** : vraie cause
**Fix** : ce qui a été fait
**Commit** : `<sha>`
**Leçon** : (optionnel) à retenir pour la suite
```

---

## 2026-08-28 — Plusieurs outils sans aperçu visuel en direct

**Symptôme** : signalé par l'utilisateur — en ajustant l'opacité du filigrane (ou d'autres réglages), rien ne changeait à l'écran ; il fallait cliquer "Appliquer" à l'aveugle pour voir le résultat.
**Root cause** : `WatermarkTool`/`PdfWatermarkTool`/`CompressTool` affichaient une image statique (voire aucune image pour `PdfWatermarkTool`/`CompressTool`) au lieu de réappliquer l'effet en direct ; `ResizeTool` ne montrait que le poids estimé, pas l'image redimensionnée.
**Fix** : ajout d'un aperçu en debounce (300ms, même pattern que l'estimation de poids déjà présente dans `ResizeTool`) dans les quatre outils — `ResizeTool`/`WatermarkTool` réappliquent la transformation réelle sur l'image affichée ; `PdfWatermarkTool` génère d'abord une miniature de la 1ère page (`renderPdfThumbnails`) puis y applique le filigrane ; `CompressTool` utilise une nouvelle fonction `renderFirstPageJpeg` (dans `pdf-to-images.ts`) qui ne rend que la 1ère page à la qualité choisie, pour rester léger.
**Leçon** : voir mémoire `feedback_live_preview` — tout nouvel outil avec réglages doit avoir un aperçu visuel en direct dès sa création, pas juste un chiffre ou une image figée.

---

## 2026-08-25 — Erreur TS2322 sur `pdf-lib` save() → Blob

**Symptôme** : `npx tsc -b` échouait sur `src/lib/pdf-merge.ts` et `src/lib/pdf-split.ts` avec `Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BlobPart'`.
**Root cause** : `PDFDocument.save()` de `pdf-lib` retourne un `Uint8Array<ArrayBufferLike>` (peut être backé par un `SharedArrayBuffer`), incompatible avec le typage strict de `BlobPart` en TS5/lib.dom récents.
**Fix** : `new Blob([bytes.slice()], ...)` — `.slice()` force une copie sur un buffer standard, TS infère alors un type compatible.
**Commit** : non commité au moment du fix (travail en cours sur `main`)
**Leçon** : ce pattern (`.slice()` avant `new Blob()`) est à réutiliser si d'autres libs renvoient des `Uint8Array` typés `ArrayBufferLike`.
