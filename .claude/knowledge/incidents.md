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

## 2026-08-25 — Erreur TS2322 sur `pdf-lib` save() → Blob

**Symptôme** : `npx tsc -b` échouait sur `src/lib/pdf-merge.ts` et `src/lib/pdf-split.ts` avec `Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BlobPart'`.
**Root cause** : `PDFDocument.save()` de `pdf-lib` retourne un `Uint8Array<ArrayBufferLike>` (peut être backé par un `SharedArrayBuffer`), incompatible avec le typage strict de `BlobPart` en TS5/lib.dom récents.
**Fix** : `new Blob([bytes.slice()], ...)` — `.slice()` force une copie sur un buffer standard, TS infère alors un type compatible.
**Commit** : non commité au moment du fix (travail en cours sur `main`)
**Leçon** : ce pattern (`.slice()` avant `new Blob()`) est à réutiliser si d'autres libs renvoient des `Uint8Array` typés `ArrayBufferLike`.
