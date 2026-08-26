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
- Tests unitaires (Vitest + jsdom + Testing Library) : ~90% de couverture globale, 129 tests, plus aucun fichier à 0%

## Priorité 1 — Stabilité

- [ ] Committer le travail en cours (Merge/Resize/Split/HEIC) — actuellement non commité sur `main`
- [ ] Réduire la taille des chunks JS (warning Vite : `heic-convert` 1.3MB, `ort-wasm` 23MB) — envisager code-splitting/manualChunks

## Priorité 2 — Confort

- [ ] Nom de domaine à vérifier/acheter (voir `temp.md` — pas fait au moment du brief)
- [ ] Mode hors-ligne complet (PWA)

## 💭 Idées / backlog

- OCR (extraction de texte depuis image ou PDF scanné)
- Compatibilité : message clair si le navigateur ne supporte pas WASM/WebGL
