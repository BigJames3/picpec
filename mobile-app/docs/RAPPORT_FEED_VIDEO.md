# RAPPORT D'ANALYSE — FEED VIDÉO PICPEC

*Généré le 20 février 2026*

---

## 1. STRUCTURE DES FICHIERS FEED

| Fichier | Chemin exact | Rôle |
|---------|--------------|------|
| **Écran Feed (Home)** | `mobile-app/app/(tabs)/home.tsx` | Écran principal du feed vidéo vertical, liste des posts avec FlashList |
| **Écran Création Post** | `mobile-app/app/create-post.tsx` | Écran pour créer/uploader une vidéo (galerie ou caméra) |
| **Onglet Create (vide)** | `mobile-app/app/(tabs)/create.tsx` | Tab vide — le bouton + redirige vers `/create-post` |
| **Écran Commentaires** | `mobile-app/app/posts/[id]/comments.tsx` | Liste des commentaires d'un post + formulaire d'ajout |
| **PostCard** | `mobile-app/src/components/feed/PostCard.tsx` | Carte d'un post : vidéo + overlays (avatar, actions) |
| **VideoPlayer** | `mobile-app/src/components/feed/VideoPlayer.tsx` | Lecteur vidéo (expo-video) avec play/pause, thumbnail |
| **API Posts** | `mobile-app/src/api/posts.api.ts` | Client API : getFeed, create, like, unlike, getComments, addComment |
| **Types** | `mobile-app/src/types/index.ts` | Interfaces `Post`, `PostUser`, `PaginatedResult` |
| **Theme** | `mobile-app/src/theme/index.ts` | `feedBg`, `feedOverlay` pour le design feed |
| **Layout Tabs** | `mobile-app/app/(tabs)/_layout.tsx` | Tab bar avec bouton + qui ouvre create-post |
| **EmptyState** | `mobile-app/src/components/ui/EmptyState.tsx` | Composant vide "Aucun post" |
| **LoadingScreen** | `mobile-app/src/components/ui/LoadingScreen.tsx` | Écran de chargement |

**Backend :**
| Fichier | Chemin exact | Rôle |
|---------|--------------|------|
| Posts Controller | `backend/src/posts/posts.controller.ts` | Routes REST posts, upload, like, comments |
| Posts Service | `backend/src/posts/posts.service.ts` | Logique métier, Cloudinary, stockage local |
| Cloudinary Service | `backend/src/posts/cloudinary.service.ts` | Upload vidéo vers Cloudinary (optionnel) |
| CreatePostDto | `backend/src/posts/dto/create-post.dto.ts` | DTO création post |
| PaginationDto | `backend/src/common/dto/pagination.dto.ts` | Pagination feed/comments |

---

## 2. COMPOSANTS VIDÉO EXISTANTS

### 2.1 PostCard (`mobile-app/src/components/feed/PostCard.tsx`)

**Contenu complet :** Voir fichier source (200 lignes).

**Props :**
- `post: Post` — objet post (id, videoUrl, thumbnailUrl, description, likesCount, commentsCount, user)
- `isActive: boolean` — indique si la vidéo est visible à l'écran (pour play/pause)

**État interne :**
- `useState(post.likesCount)` → `likes`
- `useState(false)` → `isLiked`

**Librairies :**
- `react-native`, `react-native-paper` (Text)
- `expo-router` (navigation)
- `VideoPlayer` (composant interne)
- `postsApi` (API)

**Mock vs réel :**
- **Réel :** Like/Unlike via API, partage natif Share, navigation commentaires
- **Placeholder :** Si `!post.videoUrl`, affiche un placeholder "Vidéo en cours…" avec emoji 🎬
- **Investir :** Bouton présent mais **aucun onPress** — non fonctionnel

---

### 2.2 VideoPlayer (`mobile-app/src/components/feed/VideoPlayer.tsx`)

**Contenu complet :** Voir fichier source (134 lignes).

**Props :**
- `videoUrl: string` — URL de la vidéo (distante ou locale)
- `thumbnailUrl?: string` — URL de la miniature (optionnel)
- `isActive: boolean` — lecture uniquement si true

**État interne :**
- `useState(true)` → `isLoading`
- `useState(false)` → `isPaused`
- `useState(false)` → `hasError`
- `useState(!!thumbnailUrl)` → `showThumbnail`

**Librairies :**
- **expo-video** : `useVideoPlayer`, `VideoView`
- `react-native` (View, Pressable, Image, ActivityIndicator, Text)

**Comportement :**
- `useVideoPlayer(isActive ? { uri: videoUrl } : null, (p) => { p.loop = true; p.muted = false })` — player créé uniquement si actif
- Lecture si `isActive && !isPaused`, pause sinon
- Clic sur la vidéo → toggle play/pause
- Thumbnail affiché avant chargement, masqué quand prêt
- Overlay loading (ActivityIndicator) ou pause (⏸)
- Gestion erreur : "❌ Vidéo indisponible"

**Mock vs réel :**
- **Réel :** Lecture vidéo via expo-video, URL distante ou locale
- Pas de préchargement
- Pas de barre de progression
- Son : `muted = false` (son activé par défaut)

---

### 2.3 HomeScreen (Feed) (`mobile-app/app/(tabs)/home.tsx`)

**Contenu complet :** Voir fichier source (184 lignes).

**État interne :**
- `posts`, `page`, `hasMore`, `isLoading`, `isRefreshing`, `isLoadingMore`, `activeIndex`

**Librairies :**
- `FlashList` (@shopify/flash-list)
- `postsApi.getFeed`
- `PostCard`

**Mock vs réel :**
- **Réel :** Données du feed via API `GET /posts`
- Pagination infinie, pull-to-refresh

---

## 3. BOUTONS ET ACTIONS DU FEED

| Bouton | Label / Icône | Position | onPress | Statut |
|--------|---------------|----------|---------|--------|
| **Like** | 🤍 / ❤️ + compteur | Overlay droite, 1er | `handleLike` → `postsApi.like/unlike` | ✅ Fonctionnel |
| **Commentaires** | 💬 + compteur | Overlay droite, 2e | `router.push(/posts/${id}/comments)` | ✅ Fonctionnel |
| **Partager** | 🔗 "Partager" | Overlay droite, 3e | `Share.share({ message, title })` | ✅ Fonctionnel (natif) |
| **Investir** | 💰 "Investir" | Overlay droite, 4e | Aucun | ❌ Non implémenté |
| **Play/Pause** | Tap sur vidéo | Plein écran | `handlePress` → toggle play/pause | ✅ Fonctionnel |
| **+ Créer post** | "+ Créer le premier post" | Centre (état vide) | `router.push('/create-post')` | ✅ Fonctionnel |
| **FAB +** | "+" | Haut droite (top: 52, right: 16) | `router.push('/create-post')` | ✅ Fonctionnel |
| **Changer** | "Changer" | Sur preview vidéo (create-post) | `requestAndPick(false)` galerie | ✅ Fonctionnel |
| **Galerie** | "Galerie" | create-post | `requestAndPick(false)` | ✅ Fonctionnel |
| **Caméra** | "Caméra" | create-post | `requestAndPick(true)` | ✅ Fonctionnel |
| **Publier** | "🚀 Publier" | create-post | `handlePublish` → `postsApi.create` | ✅ Fonctionnel |
| **Annuler** | "✕ Annuler" | create-post header | `router.back()` | ✅ Fonctionnel |
| **Tab +** | "+" (tab bar) | Centre tab bar | `router.push('/create-post')` | ✅ Fonctionnel |

---

## 4. NAVIGATION ET SCROLL

- **Composant :** `FlashList` (@shopify/flash-list)
- **Snap :** `snapToInterval={SCREEN_HEIGHT}`, `snapToAlignment="start"`, `decelerationRate="fast"`
- **Détection vidéo active :** `onViewableItemsChanged` + `viewabilityConfig` (75% visible, 200ms min)
- **État actif :** `activeIndex` mis à jour → passé à `PostCard` via `isActive={index === activeIndex}`
- **Pause au scroll :** Oui — `VideoPlayer` reçoit `isActive=false` quand on scroll, `player.pause()` est appelé
- **Autoplay :** Oui — la vidéo visible joue automatiquement (`isActive && !isPaused` → `player.play()`)
- **Pas de préchargement** des vidéos adjacentes

---

## 5. UPLOAD / CRÉATION DE VIDÉO

- **Écran :** `app/create-post.tsx` — complet
- **Librairie :** `expo-image-picker`
  - `ImagePicker.launchCameraAsync` (caméra, mediaTypes: ['video'], videoMaxDuration: 60)
  - `ImagePicker.launchImageLibraryAsync` (galerie, allowsEditing: true)
- **Permissions :** `requestCameraPermissionsAsync` / `requestMediaLibraryPermissionsAsync`
- **Limites :** 60 sec max, 100MB max, formats MP4, MOV, AVI, WEBM
- **Implémentation :** Complète — sélection, preview (expo-video), description, upload FormData vers backend

---

## 6. API ET BACKEND FEED

### Endpoints appelés

| Méthode | Endpoint | Usage |
|---------|----------|-------|
| GET | `/posts?page=&limit=` | Feed paginé |
| GET | `/posts/:id` | Détail post |
| POST | `/posts` | Créer post (multipart: video, description) |
| POST | `/posts/:id/like` | Liker |
| DELETE | `/posts/:id/like` | Unliker |
| GET | `/posts/:id/comments?page=&limit=` | Commentaires |
| POST | `/posts/:id/comment` | Ajouter commentaire |
| DELETE | `/posts/:id` | Supprimer post |

### Chargement des vidéos

- **URL :** Distante (Cloudinary ou `http://localhost:3000/uploads/filename`)
- **Pas de mock** — données réelles de l'API
- **Stockage backend :**
  - **Local :** `uploads/` (multer diskStorage), servi via `app.useStaticAssets(..., prefix: '/uploads/')`
  - **Cloudinary :** Si `CLOUDINARY_*` configuré, upload après réception, puis suppression du fichier local

### Format Post (Prisma)

```prisma
model Post {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  videoUrl      String?  @map("video_url")
  thumbnailUrl  String?  @map("thumbnail_url")
  description   String?
  likesCount    Int      @default(0) @map("likes_count")
  commentsCount Int      @default(0) @map("comments_count")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  user     User      @relation(...)
  comments Comment[]
  likes    PostLike[]
}
```

---

## 7. PERFORMANCE ET LECTURE

- **Préchargement :** Aucun — une seule vidéo chargée à la fois (celle visible)
- **Boucle :** `p.loop = true` dans useVideoPlayer
- **Son :** `p.muted = false` — son activé par défaut, pas de bouton mute/unmute
- **Barre de progression :** Aucune
- **Thumbnail :** Affiché avant chargement si `thumbnailUrl` fourni, masqué quand `readyToPlay`

---

## 8. FONCTIONNALITÉS MANQUANTES OU INCOMPLÈTES

### Manquantes

- Bouton **Investir** (💰) — pas de `onPress`
- Bouton **Son on/off** (mute) — pas d’UI
- **Barre de progression** vidéo
- **Préchargement** des vidéos adjacentes
- **Suivre** l’auteur — pas de modèle Follow
- **Signaler** un post — pas implémenté
- **Télécharger** la vidéo — pas implémenté
- **État "liked"** au chargement — `isLiked` initialisé à `false` sans vérifier si l’utilisateur a déjà liké

### Simulées / Partielles

- Placeholder "Vidéo en cours…" si `!videoUrl` (post sans vidéo)
- `isLiked` non synchronisé avec le backend au chargement

### TODO / Commentaires dans le code

- `posts.api.ts` : commentaire sur compression vidéo (expo-image-manipulator ne gère pas les vidéos)
- Pas d’autres TODO explicites liés au feed

---

## 9. MODÈLE DE DONNÉES (Prisma)

```prisma
model Post {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  videoUrl      String?  @map("video_url")
  thumbnailUrl  String?  @map("thumbnail_url")
  description   String?
  likesCount    Int      @default(0) @map("likes_count")
  commentsCount Int      @default(0) @map("comments_count")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  comments Comment[]
  likes    PostLike[]

  @@index([userId])
  @@index([createdAt])
  @@map("posts")
}

model Comment {
  id        String   @id @default(uuid())
  postId    String   @map("post_id")
  userId    String   @map("user_id")
  content   String
  createdAt DateTime @default(now()) @map("created_at")

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([postId])
  @@map("comments")
}

model PostLike {
  id        String   @id @default(uuid())
  postId    String   @map("post_id")
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([postId, userId])
  @@map("post_likes")
}
```

**Modèles absents :** Follow, View (vues), Report (signalement)

---

## 10. DESIGN SYSTEM FEED

### Couleurs

- **Fond feed :** `#000` (noir)
- **Overlay loading/pause :** `rgba(0,0,0,0.25)`
- **Avatar bordure :** `#fff`
- **Avatar fond :** `#E85D04` (primary)
- **Texte :** `#fff` avec `textShadowColor: rgba(0,0,0,0.9)`
- **Theme :** `feedBg: '#000000'`, `feedOverlay: 'rgba(0,0,0,0.6)'` (peu utilisés directement)

### Tailles et positions

| Élément | Position | Dimensions |
|--------|----------|------------|
| Container PostCard | Plein écran | `width: 100%`, `height: SCREEN_HEIGHT` |
| Overlay gauche | `bottom: 96`, `left: 16`, `right: 84` | Avatar + username + description |
| Avatar | — | 46×46, borderRadius 23 |
| Overlay droite | `bottom: 96`, `right: 12` | Actions empilées, gap 22 |
| Action icône | — | fontSize 30 |
| Action label | — | fontSize 11 |
| FAB | `top: 52`, `right: 16` | 44×44, borderRadius 22 |

### Composant overlay réutilisable

- **Non** — les overlays sont définis inline dans `PostCard` (`overlayLeft`, `overlayRight`)
- Pas de composant `FeedOverlay` ou similaire partagé

---

## RÉSUMÉ POUR INTÉGRATION EXPO-AV / UPLOAD RÉEL

1. **expo-video** est déjà utilisé (pas expo-av) — migration possible vers expo-av si besoin.
2. **Upload** : déjà fonctionnel (expo-image-picker + FormData + backend multer + Cloudinary).
3. **À ajouter :** bouton mute, barre de progression, préchargement, `isLiked` initial, bouton Investir.
4. **Backend :** stockage local + Cloudinary optionnel, pas de S3/Supabase.
