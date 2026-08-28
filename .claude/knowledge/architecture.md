---
project: Formaly
tags: [Formaly, architecture]
---

> Parent : [[Formaly]]

# Architecture — Formaly

Vue d'ensemble des composants, flux et décisions structurantes.

## Vue d'ensemble

Site statique (Vite + React 19 + TypeScript + Tailwind v4) qui regroupe des outils de conversion de fichiers et d'édition d'image basique. Aucun backend : le traitement se fait dans le navigateur, dans un Web Worker dédié pour ne pas bloquer l'UI. Hébergement statique uniquement.

## Composants

### App shell (`src/App.tsx`)
- **Rôle** : orchestre le flux upload → détection type → sélection mode (convert/crop/remove-bg/resize/split/ocr) → traitement → export. Gère aussi le flux séparé "fusion PDF" (accessible sans passer par le dropzone principal).
- **Stack** : React (state local, pas de state manager externe)
- **Lazy-loading** : `CropTool`, `ResizeTool`, `SplitTool`, `MergeTool`, `RemoveBackgroundTool`, `OcrTool` sont importés via `React.lazy(() => import(...).then(m => ({ default: m.XxxTool })))` (named exports) + `<Suspense>` avec un fallback texte simple. Réduit le bundle principal de 692 Ko à 213 Ko gzip — ces outils tirent des libs lourdes (`react-easy-crop`, `pdf-lib`, `tesseract.js`) qui n'ont pas de raison de charger avant que l'utilisateur choisisse le mode correspondant.
- **Compatibilité** : `checkBrowserSupport()` (`src/lib/check-browser-support.ts`) vérifie `WebAssembly` au montage, bandeau ambre si absent (PDF.js et remove-bg en dépendent).
- **Chemin** : `src/App.tsx`

### Détection de type de fichier (`src/lib/file-type-detector.ts`)
- **Rôle** : détecte le type réel par signature binaire (magic bytes), pas par extension. Supporte PNG, JPEG, WebP, PDF, HEIC (via brands ftyp).
- **Chemin** : `src/lib/file-type-detector.ts`

### Web Worker de traitement (`src/workers/processing.worker.ts`)
- **Rôle** : conversion image↔image et image→PDF via Canvas API, hors du thread principal.
- **Chemin** : `src/workers/processing.worker.ts`

### Outils d'édition (composants React + lib associée)
- **CropTool** (`src/components/CropTool.tsx` + `src/lib/crop-image.ts`) — rognage via `react-easy-crop`
- **RemoveBackgroundTool** (`src/components/RemoveBackgroundTool.tsx` + `src/lib/remove-background.ts`) — suppression de fond via `@huggingface/transformers` (modèle IA en WASM/ONNX, chargé en lazy import)
- **ResizeTool** (`src/components/ResizeTool.tsx` + `src/lib/resize-image.ts`) — redimensionnement/compression, aperçu du poids estimé en debounce (300ms)
- **SplitTool** (`src/components/SplitTool.tsx` + `src/lib/pdf-split.ts`) — découpage PDF page par page, sélection via miniatures (`renderPdfThumbnails` dans `pdf-to-images.ts`)
- **MergeTool** (`src/components/MergeTool.tsx` + `src/lib/pdf-merge.ts`) — fusion de plusieurs PDF, réordonnable par drag/boutons, accessible via un lien dédié depuis l'écran d'accueil (pas de fichier unique en entrée donc flux séparé du reste)
- **OcrTool** (`src/components/OcrTool.tsx` + `src/lib/ocr.ts`) — extraction de texte via `tesseract.js` (langue `fra+eng`, worker + traineddata téléchargés à la demande par la lib), résultat affiché dans un textarea + bouton copier, `onApply` reçoit un `Blob` `text/plain` pour réutiliser l'`ExportButton` existant (export en `.txt`)

### Conversion PDF (`src/lib/pdf-to-images.ts`)
- **Rôle** : PDF → images (une ou plusieurs pages, zip via `fflate` si multi-page), inspection (page count + aperçu 1ère page), génération de miniatures. Basé sur `pdfjs-dist`.
- **Chemin** : `src/lib/pdf-to-images.ts`

### HEIC (`src/lib/heic-convert.ts`)
- **Rôle** : conversion HEIC → PNG via `heic2any`, en amont du reste du pipeline (le fichier HEIC original n'est jamais traité directement par les autres outils).

### Formats image additionnels (AVIF, BMP, ICO, TIFF, GIF statique, SVG)
- **Contrainte** : `OffscreenCanvas`/`HTMLCanvasElement` ne savent encoder que PNG/JPEG/WebP (`processing.worker.ts`). Ces formats ne passent donc jamais par le worker.
- **Normalisation source → PNG** (`src/lib/image-codecs.ts`, fonctions `decodeImageFileToImageData`/`decodeImageFileToPngBlob` via `createImageBitmap` + canvas) : utilisée pour normaliser en amont (comme HEIC) les sources SVG/AVIF/BMP/ICO/GIF (décodage natif navigateur) et, via `src/lib/tiff-convert.ts` (`decodeTiffToPngBlob`, lib `utif`), TIFF (pas de décodage natif). État `normalizedAsset` dans `App.tsx`, généralisation du pattern `heicAsset` existant (`needsNormalization()`, `NORMALIZABLE_TYPES` exporté par `file-type-detector.ts`).
- **Encodage cible** (choisi dans `ToolSelector`, dispatché dans le `useEffect` de conversion de `App.tsx` via `isExoticTargetFormat()`/`convertToExoticFormat()`, en dehors du worker) :
  - **AVIF** — `src/lib/avif-convert.ts`, encode via `@jsquash/avif` (wasm, lazy-loadé, gros payload comme le modèle remove-bg)
  - **BMP** — `src/lib/bmp-convert.ts`, encodeur maison (BMP 24-bit non compressé)
  - **ICO** — `src/lib/ico-convert.ts`, conteneur ICO maison qui wrappe directement les octets PNG (pas de décodage nécessaire)
  - **TIFF** — `src/lib/tiff-convert.ts`, encode via `utif` (`UTIF.encodeImage`, non compressé)
- **Hors périmètre volontaire** : export SVG (vectorisation, jugé trop lourd), GIF animé (lecture/écriture multi-frame — seule la première frame est supportée en lecture, pas d'export GIF).
- **PWA** : `@jsquash/avif` a nécessité `worker: { format: 'es' }` dans `vite.config.ts` (son worker multi-thread `avif_enc_mt.js` casse le build en format iife par défaut). Les chunks `avif_enc*`/`avif_dec*`/`avif-convert*`/`tiff-convert*` sont exclus du precache PWA (mêmes `globIgnores`/`runtimeCaching` que les autres outils lourds) ; `bmp-convert`/`ico-convert`/`image-codecs` restent précachés (chunks légers, comme les autres outils).

## Flux principaux

- **Conversion simple** : Dropzone → détection type → ModeSelector (convert) → ToolSelector (format cible) → Worker (image) ou lib dédiée (PDF/HEIC) → PreviewPanel → ExportButton
- **Édition (crop/remove-bg/resize)** : idem mais bascule sur le composant d'outil dédié après détection, qui applique et retourne un blob via `onApply`
- **PDF multi-page** : détection déclenche `inspectPdf` → si >1 page, choix Convertir/Découper ; `pdf → png` HEIC/PDF passent systématiquement par une conversion PNG intermédiaire avant crop/resize/remove-bg
- **Fusion PDF** : flux totalement séparé, pas de Dropzone principal, plusieurs fichiers en entrée

## PWA / hors-ligne

- **Plugin** : `vite-plugin-pwa` (`registerType: 'autoUpdate'`, config dans `vite.config.ts`).
- **Precache** (install) : shell applicatif uniquement — bundle principal, CSS, chunks lazy déjà légers (CropTool, MergeTool, ResizeTool, SplitTool, OcrTool, RemoveBackgroundTool, bmp-convert, ico-convert, image-codecs), icônes/manifest/html. ~401 KiB, 33 entrées.
- **Runtime cache (CacheFirst, à la demande)** : gros chunks lazy-loadés — `ort-wasm*` (23,5 Mo, modèle remove-bg), `pdf.worker*` (1,26 Mo), `pdf-to-images*`, `heic-convert*` (1,35 Mo), `transformers.web*`, `PDFButton*`, `processing.worker*`, `avif_enc*`/`avif_dec*` (wasm `@jsquash/avif`, ~3,5 Mo), `avif-convert*`, `tiff-convert*` (~39 Ko, `utif`). Exclus du precache explicitement (`globIgnores`/`maximumFileSizeToCacheInBytes: 300*1024` en garde-fou) pour ne pas alourdir l'installation.
- **Icônes** : `public/icon.svg` + `icon-maskable.svg` (sources), PNG générés (`pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, `apple-touch-icon.png`, favicons) — monogramme "F" sur dégradé terracotta cohérent avec le thème.

## Tests

- **Framework** : Vitest + jsdom + Testing Library (`npm test` = run, `npm run test:watch`, `npx vitest run --coverage` pour le rapport v8). Config dans `vitest.config.ts`, setup global dans `src/vitest.setup.ts` (matchers jest-dom + cleanup RTL) — volontairement sous `src/` car `tsc -b` ne type-check que ce dossier, et l'augmentation de types jest-dom doit être visible du même programme.
- **Fichiers** : `src/**/*.test.{ts,tsx}` colocalisés avec le code testé.
- **Couverture** (v8, ~90% global au 2026-08-26, 145 tests) : quasi 100% sur `src/lib`, ~85% sur `src/components`, ~90% sur `App.tsx`, ~87% sur `processing.worker.ts`. Plus aucun fichier à 0%.
- **Piège `navigator.clipboard` + `userEvent.setup()`** : `@testing-library/user-event` réinitialise/redéfinit `navigator.clipboard` lors de `userEvent.setup()`. Un stub posé en `beforeEach` (avant l'appel à `setup()` dans le corps du test) se fait donc écraser. Toujours définir `Object.defineProperty(navigator, 'clipboard', {...})` APRÈS `userEvent.setup()`. Voir `OcrTool.test.tsx`.
- **Pattern de mock Canvas/Image** : `vi.stubGlobal('Image', MockImage)` avec un setter `src` qui déclenche `onload` en microtask, + `vi.spyOn(HTMLCanvasElement.prototype, 'getContext'/'toBlob')`. Voir `resize-image.test.ts`/`crop-image.test.ts` comme référence.
- **Pattern de mock d'import dynamique** : `vi.doMock('module-name', ...)` + `await import('./lib-file')` à l'intérieur du test (pas d'import statique du module testé) pour que le mock soit actif avant le premier appel. Voir `pdf-to-images.test.ts`/`heic-convert.test.ts`/`remove-background.test.ts`.
- **Piège `vi.stubGlobal('URL', {...})`** : remplacer l'objet global `URL` casse son usage comme constructeur (`new URL(...)`, utilisé par `App.tsx` pour l'URL du Worker). Toujours préférer `vi.spyOn(URL, 'createObjectURL'/'revokeObjectURL')` pour ne mocker que les méthodes statiques.
- **Piège `user.upload()` et l'attribut `accept`** : Testing Library filtre les fichiers ne correspondant pas à l'`accept` de l'`<input>`, comme un vrai navigateur — invisible si le test veut justement vérifier le rejet d'un type de fichier. Utiliser `fireEvent.change(input, { target: { files: [...] } })` dans ce cas précis.
- **Pattern de mock Worker** : classe `MockWorker` (implémentant `postMessage`/`addEventListener`/`removeEventListener`/`terminate`, avec une méthode `emitMessage` pour simuler une réponse) posée via `vi.stubGlobal('Worker', MockWorker)`. Voir `App.test.tsx`.
- **`App.tsx`** : testé en mockant tous les outils enfants (`CropTool`, `ResizeTool`, etc. — déjà couverts individuellement) par de simples stubs, plus `Worker`, `./lib/heic-convert` et `./lib/pdf-to-images`, pour isoler la logique d'orchestration (détection de type, bascule de mode, calcul du nom/format d'export, gestion des messages worker).

## Décisions structurantes

### 2026-08-25 — Formalisation `.claude/knowledge/`
**Contexte** : app déjà avancée (conversion, crop, remove-bg, resize, split, merge, HEIC) mais sans mémoire projet persistante.
**Choix** : création de la knowledge base standard (roadmap/architecture/incidents).
**Raison** : garder trace des décisions et de l'état d'avancement au-delà de l'historique git.
**Alternatives écartées** : aucune (pas de backend/API/DB/déploiement à documenter en plus).

### Traitement 100% client-side
**Contexte** : différenciation face aux convertisseurs en ligne payants/limités.
**Choix** : tout le traitement (conversion, édition) a lieu dans le navigateur (Canvas API, Web Worker, WASM pour PDF.js et le modèle de suppression de fond).
**Raison** : confidentialité réelle, pas de limite d'usage, coût d'hébergement quasi nul (site statique).
**Alternatives écartées** : traitement serveur (rejeté dès le brief initial, voir `temp.md`).
