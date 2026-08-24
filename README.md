# Formaly

Convertir et éditer ses fichiers, gratuitement, sans limite, sans rien envoyer sur un serveur.

## Le concept

Formaly regroupe des outils de conversion (PNG, JPEG, PDF...) et d'édition d'image basique (rognage, suppression de fond) dans un site web unique. Tout le traitement a lieu **directement dans le navigateur**, dans un Web Worker — aucun fichier n'est jamais envoyé à un serveur.

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- Traitement fichier dans un Web Worker dédié (Canvas API, à terme WASM pour les conversions plus lourdes)

## Développement

```bash
npm install
npm run dev      # serveur de dev
npm run build    # build de prod
```

## Licence

AGPL-3.0 avec Commons Clause — voir [LICENSE](./LICENSE). Usage et modification libres, republication du code source obligatoire (y compris en usage SaaS), mais toute exploitation commerciale nécessite un accord préalable.
