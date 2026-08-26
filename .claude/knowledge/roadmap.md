---
project: Formaly
tags: [Formaly, roadmap]
---

> Parent : [[Formaly]]

# Roadmap — Formaly

Suivi des tâches par ordre de valeur.

## ✅ Fait

- MVP conversion PNG ↔ JPEG ↔ WebP, Image → PDF, PDF → Images
- Rognage (crop) et suppression de fond
- Redesign UI (thème éditorial "warm paper")
- Support crop / remove-bg sur PDF mono-page (conversion intermédiaire en PNG)
- Relicensing AGPL-3.0 + Commons Clause
- Support HEIC (détection par magic bytes + conversion vers PNG)
- Redimensionnement / compression d'image (ResizeTool)
- Fusion de PDF (MergeTool)
- Découpage de PDF (SplitTool, sélection par miniatures)
- Tests unitaires (Vitest + jsdom + Testing Library) : ~90% de couverture globale, 145 tests, plus aucun fichier à 0%
- Lazy-loading des outils (Crop/Resize/Split/Merge/RemoveBackground/Ocr) — bundle principal 692 Ko → 213 Ko gzip
- Avertissement de compatibilité si `WebAssembly` indisponible
- Mode hors-ligne / PWA (`vite-plugin-pwa`, precache ~349 KiB, gros assets en cache runtime à la demande)
- OCR (extraction de texte depuis image ou PDF mono-page scanné, via `tesseract.js`)

## Priorité 2 — Confort

- [ ] Nom de domaine à vérifier/acheter (voir `temp.md` — pas fait au moment du brief)
- [ ] Réduire encore les gros chunks lazy (`heic-convert` 1.3MB, `pdf.worker` 1.26MB, `transformers.web` 558KB) — déjà hors bundle principal et hors precache PWA, mais pourraient bénéficier d'un split plus fin si le temps de premier usage d'un outil devient un problème perçu

## 💭 Idées / backlog

- Compatibilité WebGL (seul WASM est vérifié actuellement, voir `check-browser-support.ts`)
