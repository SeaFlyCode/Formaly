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
- Nouveaux formats image — Lot 1 : AVIF, BMP, ICO, TIFF (lecture/écriture), GIF et SVG (lecture seule, première frame pour GIF) ; normalisation source généralisée à partir du pattern HEIC (`normalizedAsset`/`needsNormalization` dans `App.tsx`, voir `architecture.md`)
- Outils PDF — Lot 2 : rotation, réorganisation de pages, filigrane (PDF entier ou image/PDF mono-page), compression (rasterisation JPEG), extraction de texte natif ; gestion propre des PDF protégés par mot de passe (message clair au lieu d'un échec silencieux) — voir `architecture.md`

## Priorité 2 — Confort

- [ ] Nom de domaine à vérifier/acheter (voir `temp.md` — pas fait au moment du brief)
- [ ] Réduire encore les gros chunks lazy (`heic-convert` 1.3MB, `pdf.worker` 1.26MB, `transformers.web` 558KB) — déjà hors bundle principal et hors precache PWA, mais pourraient bénéficier d'un split plus fin si le temps de premier usage d'un outil devient un problème perçu

## 💭 Idées / backlog

### Légères — bon fit client-side
- [x] AVIF ↔ PNG/JPEG/WebP (encodage via `@jsquash/avif`, décodage natif navigateur) — fait (Lot 1)
- [x] SVG → PNG/JPEG/WebP (décodage natif navigateur, pas d'export SVG) — fait (Lot 1)
- [x] BMP, TIFF, ICO (lecture/écriture — `utif` pour TIFF, encodage BMP/ICO maison) — fait (Lot 1)
- [x] GIF → PNG/JPEG/WebP (lecture seule, première frame uniquement, décodage natif navigateur) — fait (Lot 1)
- [ ] GIF animé (lecture/écriture multi-frame) — écarté du Lot 1, nécessiterait `gifuct-js`/`gif.js` ou équivalent pour peu de valeur ajoutée vs. la complexité
- [ ] Markdown ↔ HTML (`marked`/`turndown`, zéro dépendance lourde)
- [ ] CSV ↔ JSON ↔ XLSX (`xlsx`/`papaparse`, léger)
- [x] Extraction texte PDF natif (`pdfjs-dist` `getTextContent`, toutes pages) — fait (Lot 2)
- [x] Rotation de pages PDF (`pdf-lib`) — fait (Lot 2)
- [x] Réorganisation de pages PDF (boutons monter/descendre, pas de drag natif) — fait (Lot 2)
- [x] Ajout de filigrane (watermark) PDF/image — fait (Lot 2)
- [x] Compression PDF (rasterisation JPEG par page, pas de downsampling fin des images internes) — fait (Lot 2)
- [ ] Protection/déverrouillage PDF par mot de passe — écarté, voir section dédiée ci-dessous
- [ ] Génération de QR code / lecture de QR code depuis image
- [ ] Lecture/suppression de métadonnées EXIF (cohérent avec le positionnement confidentialité)

### Plus lourdes — faisable mais coûteux (image tracing WASM)
- [ ] PNG/JPEG → SVG (tracé vectoriel, `imagetracerjs`/`potrace` en WASM)
- [ ] EPUB → texte/PDF (`epub.js`, niche)

### Écartées pour l'instant — trop lourdes pour le front
- Protection/déverrouillage PDF par mot de passe — `pdf-lib` (déjà en dépendance) ne supporte pas le chiffrement PDF, pas d'alternative client-side légère fiable. À la place : un PDF déposé déjà chiffré déclenche un message d'erreur clair (`inspectPdf` catche `PasswordException`) plutôt qu'un échec silencieux.
- Conversion audio (MP3 ↔ WAV ↔ OGG) via `ffmpeg.wasm` — ~25 Mo comme le modèle remove-bg, faisable techniquement (pattern lazy-load + cache PWA déjà en place) mais gros chantier UI/mémoire pour un besoin hors coeur de cible
- Compression/recadrage vidéo via `ffmpeg.wasm` — même remarque, temps de traitement navigateur + gestion mémoire non triviaux
- PDF ↔ DOCX fidèle (mise en page) — pas de moteur DOCX léger fiable en WASM
- OCR de mise en page complexe (tableaux, colonnes) — `tesseract.js` reste basique, hors scope réaliste

### Autres
- Compatibilité WebGL (seul WASM est vérifié actuellement, voir `check-browser-support.ts`)
