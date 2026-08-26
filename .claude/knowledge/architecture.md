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
- **Rôle** : orchestre le flux upload → détection type → sélection mode (convert/crop/remove-bg/resize/split) → traitement → export. Gère aussi le flux séparé "fusion PDF" (accessible sans passer par le dropzone principal).
- **Stack** : React (state local, pas de state manager externe)
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

### Conversion PDF (`src/lib/pdf-to-images.ts`)
- **Rôle** : PDF → images (une ou plusieurs pages, zip via `fflate` si multi-page), inspection (page count + aperçu 1ère page), génération de miniatures. Basé sur `pdfjs-dist`.
- **Chemin** : `src/lib/pdf-to-images.ts`

### HEIC (`src/lib/heic-convert.ts`)
- **Rôle** : conversion HEIC → PNG via `heic2any`, en amont du reste du pipeline (le fichier HEIC original n'est jamais traité directement par les autres outils).

## Flux principaux

- **Conversion simple** : Dropzone → détection type → ModeSelector (convert) → ToolSelector (format cible) → Worker (image) ou lib dédiée (PDF/HEIC) → PreviewPanel → ExportButton
- **Édition (crop/remove-bg/resize)** : idem mais bascule sur le composant d'outil dédié après détection, qui applique et retourne un blob via `onApply`
- **PDF multi-page** : détection déclenche `inspectPdf` → si >1 page, choix Convertir/Découper ; `pdf → png` HEIC/PDF passent systématiquement par une conversion PNG intermédiaire avant crop/resize/remove-bg
- **Fusion PDF** : flux totalement séparé, pas de Dropzone principal, plusieurs fichiers en entrée

## Tests

- **Framework** : Vitest + jsdom + Testing Library (`npm test` = run, `npm run test:watch`, `npx vitest run --coverage` pour le rapport v8). Config dans `vitest.config.ts`, setup global dans `src/vitest.setup.ts` (matchers jest-dom + cleanup RTL) — volontairement sous `src/` car `tsc -b` ne type-check que ce dossier, et l'augmentation de types jest-dom doit être visible du même programme.
- **Fichiers** : `src/**/*.test.{ts,tsx}` colocalisés avec le code testé.
- **Couverture** (v8, ~90% global au 2026-08-26, 129 tests) : quasi 100% sur `src/lib`, ~85% sur `src/components`, ~92% sur `App.tsx`, ~87% sur `processing.worker.ts`. Plus aucun fichier à 0%.
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
