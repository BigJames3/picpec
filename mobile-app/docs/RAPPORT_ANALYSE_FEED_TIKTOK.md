# 📋 Rapport d'analyse — Optimisation Feed PicPec style TikTok

---

## CHECKLIST FINALE — Modifications effectuées

| Amélioration | Fichier | Détail |
|--------------|---------|--------|
| FlashList optimisé | home.tsx | bounces={false}, overScrollMode="never", viewabilityConfig 85%, windowSize={3} |
| VideoProgressBar | GlobalVideoOverlay.tsx, VideoProgressBar.tsx | Barre 3px, timeUpdate event, position/duration |
| SideButtons TikTok | SideButtons.tsx | Avatar 52px, Follow, Like (spring), Commentaires, Partager, Invest, Options |
| VideoOverlayLeft | VideoOverlayLeft.tsx | @username, description 2 lignes, 🎵 son |
| HeartBurst | HeartBurst.tsx | Double-tap, opacity+scale 900ms |
| Optimistic like | PostCard.tsx | Mise à jour immédiate, rollback on error |
| formatCount 1.2K/3.4M | formatCount.ts | 1.2K, 3.4M |
| Share avec URL | SideButtons.tsx | Share.share() avec getShareUrl(post.id) |
| useFeed hook | hooks/useFeed.ts | videos, fetchNextPage, isLoading, hasMore |
| Backend select | posts.service.ts | Sélection explicite des champs (évite overfetch) |

---

## 1. FICHIERS LUS

### Mobile-app
| Fichier | Description |
|---------|-------------|
| `app/(tabs)/home.tsx` | Écran principal Feed avec FlashList |
| `src/components/feed/GlobalVideoOverlay.tsx` | Lecteur vidéo global (expo-video) |
| `src/components/feed/PostCard.tsx` | Carte post avec thumbnail + overlay |
| `src/components/feed/FeedSkeleton.tsx` | Skeleton loading |
| `src/components/feed/VideoPlayer.tsx` | Lecteur alternatif (non utilisé dans feed actuel) |
| `src/store/feed.store.ts` | Zustand store feed |
| `src/api/feed.api.ts` | API feed cursor-based |
| `src/api/posts.api.ts` | API posts (like, follow, etc.) |
| `src/types/index.ts` | Types Post, User |
| `src/types/feed.types.ts` | Types FeedMeta, FeedResponse |
| `package.json` | Dépendances |

### Backend
| Fichier | Description |
|---------|-------------|
| `src/posts/posts.controller.ts` | Routes GET /posts, like, follow, etc. |
| `src/posts/posts.service.ts` | findAll avec cursor, like, follow |
| `src/common/dto/pagination.dto.ts` | PaginationDto, paginate() |
| `prisma/schema.prisma` | Modèle Post (likesCount, commentsCount, viewsCount) |

---

## 2. PROBLÈMES DÉTECTÉS

### 2.1 — Feed principal (home.tsx)
- ✅ **FlashList déjà utilisé** — pas de migration nécessaire
- ❌ **bounces** non défini → doit être `bounces={false}` pour snap TikTok
- ❌ **overScrollMode** non défini (Android)
- ❌ **itemVisiblePercentThreshold: 80** → recommandé 85 pour TikTok
- ❌ **windowSize** non défini sur FlashList (drawDistance existe mais pas windowSize)
- ❌ **ScrollView** utilisé pour le skeleton loading (acceptable, pas critique)

### 2.2 — Lecteur vidéo (GlobalVideoOverlay)
- ✅ **expo-video** (useVideoPlayer + VideoView) — moderne
- ✅ **Pause hors écran** — player.pause() quand !isScreenFocused || !hasVideo
- ✅ **Préchargement** — feed.store preloadNext() (thumbnails + HEAD)
- ❌ **VideoProgressBar** absente — pas de barre de progression visible
- ❌ **onPlaybackStatusUpdate** — expo-video n'expose pas directement ; utiliser addListener
- ⚠️ **Remise à zéro position** — replaceAsync charge une nouvelle source, donc OK

### 2.3 — PostCard
- ✅ **React.memo** présent
- ✅ **useCallback** sur handlers
- ❌ **Like** — pas d'optimistic update (attend le serveur)
- ❌ **HeartBurst** — animation existe mais durée 400ms, pas 900ms comme spec
- ❌ **SideButtons** — layout différent du spec TikTok (Investir, Signaler au lieu de partages)
- ❌ **formatCount** — pas de format 1.2K, 3.4M (actuellement 999 → 1.0k)
- ❌ **Share** — pas d'URL de vidéo dans Share.share()

### 2.4 — Pagination backend
- ✅ **Cursor-based** déjà implémenté (cursor, nextCursor, hasMore)
- ✅ **findAll** supporte cursor
- ⚠️ **Tri complexe** — orderBy multi-colonnes + score enrichi ; index sur createdAt existe
- ❌ **Sélection de champs** — pas de .select(), overfetch possible

### 2.5 — Modèle Post
- Champs : id, userId, videoUrl, hlsUrl, imageUrl, mediaType, thumbnailUrl, duration, description, likesCount, commentsCount, viewsCount
- ❌ **sharesCount** absent — pas de compteur partages en BDD
- ✅ **isLiked, isFollowing** retournés par le service

### 2.6 — useFeed
- ❌ **Pas de hook useFeed** — logique dans feed.store (Zustand)
- Le store gère déjà fetchFeed, cursor, hasMore, preloadNext
- On peut créer un hook useFeed() qui wrap le store pour une API plus propre

### 2.7 — Dépendances manquantes
- `react-native-bottom-sheet` ou `@gorhom/bottom-sheet` — pour BottomSheet commentaires (optionnel, écran comments existe déjà)
- Pas de Share natif — `Share` de react-native déjà utilisé

---

## 3. PLAN DE MODIFICATION

| Fichier | Action |
|---------|--------|
| `home.tsx` | bounces={false}, viewabilityConfig 85%, keyExtractor stable |
| `GlobalVideoOverlay.tsx` | Ajout VideoProgressBar, listener position/duration |
| `PostCard.tsx` | Refactor → SideButtons + VideoOverlay + HeartBurst séparés, optimistic like |
| `feed.store.ts` | isFetching ref pour double-fetch, retry |
| `useFeed.ts` (nouveau) | Hook useFeed() |
| `SideButtons.tsx` (nouveau) | Colonne droite TikTok |
| `VideoOverlay.tsx` (nouveau) | Overlay bas gauche |
| `HeartBurst.tsx` (nouveau) | Animation double-tap |
| `VideoProgressBar.tsx` (nouveau) | Barre progression |
| `posts.service.ts` | .select() si Prisma le permet, index vérifié |
| `pagination.dto.ts` | Déjà OK |

---

## 4. RÉSUMÉ

- **Points forts** : FlashList, cursor pagination, expo-video, Zustand, React.memo sur PostCard
- **À améliorer** : bounces/snap, VideoProgressBar, formatCount 1.2K/3.4M, optimistic like, Share URL, layout SideButtons TikTok
