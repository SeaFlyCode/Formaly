# Formaly

**Convertir et éditer ses fichiers, gratuitement, sans limite, sans rien envoyer sur un serveur.**

---

## 1. Le problème

Convertir un fichier (PNG, PDF, JPEG, HEIC...) ou faire une retouche simple (retirer un fond, détourer, rogner) devrait être trivial. En pratique, deux options existent aujourd'hui :

- Des logiciels payants type Adobe, chers pour un usage occasionnel.
- Des sites web gratuits qui bloquent après 2 ou 3 conversions et poussent vers un abonnement.

Aucune des deux options n'est satisfaisante pour quelqu'un qui a juste besoin de convertir ou retoucher un fichier de temps en temps.

## 2. La solution

Un site web responsive (accessible aussi bien sur ordinateur que sur téléphone, mais pas une application mobile) qui regroupe :

- **Des outils de conversion de fichiers** entre formats courants (images, PDF...).
- **Des outils d'édition d'image basiques** : suppression de fond, détourage, rognage.

Le tout **gratuit, sans compte, sans limite de nombre d'utilisations**.

## 3. Le choix technique différenciant : tout se passe dans le navigateur

C'est le cœur du projet : au lieu d'envoyer le fichier de l'utilisateur à un serveur pour le traiter, **tout le traitement a lieu directement dans le navigateur** (client-side), grâce à des librairies compilées en WebAssembly.

Conséquences concrètes :

- **Confidentialité réelle** : aucun fichier ne quitte l'appareil de l'utilisateur.
- **Aucune limite artificielle** : pas de serveur à faire tourner qui coûte de l'argent à chaque conversion, donc pas de raison de brider l'usage.
- **Coût d'hébergement quasi nul**, même si le trafic grossit, puisque le site est purement statique.
- **Argument marketing fort** face à la concurrence, qui elle traite les fichiers côté serveur.

## 4. Fonctionnalités

### MVP (version minimale)

| Catégorie | Outils |
|---|---|
| Conversion | PNG ↔ JPEG ↔ WebP, Image → PDF, PDF → Images |
| Édition | Rognage (crop), suppression de fond |
| Interface | Un seul écran : glisser-déposer → choix de l'action → export |

### Pistes d'évolution (après le MVP)

- Support HEIC (photos iPhone)
- Compression / redimensionnement d'image
- Fusion / découpage de PDF
- OCR (extraction de texte depuis une image ou un PDF scanné)
- Mode hors-ligne complet (PWA)

## 5. Architecture technique

Le traitement se répartit entre deux acteurs, tous deux côté client :

- **Le thread principal** : gère l'interface, l'upload du fichier, l'aperçu et le téléchargement du résultat.
- **Un Web Worker** : reçoit le fichier, appelle le module de traitement adapté (conversion ou édition), renvoie le résultat — sans jamais bloquer l'affichage pendant que ça calcule.

Aucun serveur de traitement n'intervient : le fichier va de l'utilisateur au navigateur, et ressort en téléchargement local.

### Stack technique pressentie

- **Frontend** : React ou Vue + Tailwind CSS (pour un responsive rapide à mettre en place)
- **Conversion PDF** : `pdf-lib`, `pdf.js`
- **Conversion image** : `@jsquash` (PNG, JPEG, WebP, AVIF)
- **HEIC** : `heic2any`
- **Suppression de fond** : `@imgly/background-removal` (modèle IA exécuté en WASM/ONNX dans le navigateur)
- **Rognage** : Canvas API + `react-easy-crop`
- **Hébergement** : site statique (Cloudflare Pages, Vercel ou Netlify)

### Structure de projet envisagée

```
/src
  /modules
    /convert-image
    /convert-pdf
    /convert-heic
    /edit-background
    /edit-crop
  /workers
    processing.worker.js
  /components
    Dropzone, PreviewPanel, ToolSelector, ExportButton
  /lib
    file-type-detector.js
```

## 6. Points de vigilance

- **Lazy loading** des modules WASM : ne charger un outil que lorsqu'il est utilisé, pour ne pas alourdir le chargement initial (les modèles IA pèsent plusieurs Mo).
- **Détection du type de fichier par contenu réel** (et non par l'extension), pour éviter les erreurs.
- **Gestion mémoire** : penser à libérer les ressources après chaque téléchargement.
- **Compatibilité** : prévoir un message clair si le navigateur ou l'appareil ne supporte pas WASM/WebGL, plutôt qu'un plantage silencieux.

## 7. Nom du projet

**Formaly** — évoque le mot "format" tout en restant court et facile à prononcer en français comme en anglais. À vérifier : disponibilité du nom de domaine (`.com`, ou alternative `.io` / `.app` / `.co`) auprès d'un registrar avant de s'y engager définitivement.

## 8. Prochaines étapes

- [ ] Vérifier la disponibilité du nom de domaine
- [ ] Réaliser une maquette / wireframe de l'interface
- [ ] Développer un premier prototype fonctionnel (ex. conversion PNG ↔ PDF)
- [ ] Tester la suppression de fond en conditions réelles (performance sur mobile/tablette)