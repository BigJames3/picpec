# Rapport d'analyse – Bugs du feed vidéo PICPEC

**Date :** 23 février 2025  
**Projet :** PICPEC mobile-app + backend

---

## Résumé exécutif

Plusieurs causes identifiées peuvent expliquer les problèmes d’ajout de vidéo/image et de non-réponse des boutons :

1. **CRITIQUE** : `Content-Type: multipart/form-data` défini manuellement dans `posts.api.ts` empêche l’envoi correct du FormData (boundary manquant).
2. **CRITIQUE** : `mediaTypes: ['video']` est invalide – expo-image-picker attend `'videos'` (pluriel).
3. **IMPORTANT** : L’écran create-post ne gère que les vidéos, pas les images.
4. **POTENTIEL** : `viewabilityConfig` passé en `ref` à FlashList peut ne pas être correctement pris en compte.
5. **Permissions** : `cameraPermission` manquant dans la config expo-image-picker.

---

## 1. ÉCRAN CRÉATION DE POST (create-post.tsx)

### Contenu complet du fichier

```tsx
import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import { useVideoPlayer, VideoView } from 'expo-video';
import { postsApi } from '../src/api/posts.api';
import { ErrorMessage } from '../src/components/ui/ErrorMessage';

const VideoPreview = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={styles.videoPreview}
      contentFit="cover"
      nativeControls={false}
    />
  );
};

export default function CreatePostScreen() {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const requestAndPick = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (perm.status !== 'granted') {
      Alert.alert(
        'Permission refusée',
        useCamera
          ? 'Accès caméra requis pour enregistrer une vidéo.'
          : 'Accès galerie requis pour choisir une vidéo.',
      );
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['video'] as unknown as ImagePicker.MediaType[],
          videoMaxDuration: 60,
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['video'] as unknown as ImagePicker.MediaType[],
          allowsEditing: true,
          quality: 0.8,
          videoMaxDuration: 60,
        });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 100 * 1024 * 1024) {
      setError('Vidéo trop lourde (max 100MB). Essayez une vidéo plus courte.');
      return;
    }
    setVideoUri(asset.uri);
    setError('');
  };

  const handlePublish = async () => {
    if (!videoUri) {
      setError('Choisissez ou enregistrez une vidéo.');
      return;
    }
    if (!description.trim()) {
      setError('Ajoutez une description.');
      return;
    }

    setIsUploading(true);
    setError('');
    try {
      let thumbnailUri: string | undefined;
      try {
        const { uri } = await getThumbnailAsync(videoUri, { time: 1000 });
        thumbnailUri = uri;
      } catch {
        /* ignore */
      }
      await postsApi.create({
        description: description.trim(),
        videoUri,
        thumbnailUri,
      });
      Alert.alert('✅ Publié !', 'Votre vidéo est en ligne.', [
        { text: 'Voir le feed', onPress: () => router.replace('/(tabs)/home') },
      ]);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Erreur lors de la publication.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancel}>✕ Annuler</Text>
          </TouchableOpacity>
          <Text variant="titleLarge" style={styles.title}>
            Nouveau post
          </Text>
          <View style={{ width: 72 }} />
        </View>

        {videoUri ? (
          <View style={styles.videoBox}>
            <VideoPreview uri={videoUri} />
            <TouchableOpacity
              style={styles.changeBtn}
              onPress={() => requestAndPick(false)}
            >
              <Text style={styles.changeBtnText}>Changer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.picker}>
            <Text style={styles.pickerIcon}>🎬</Text>
            <Text style={styles.pickerTitle}>Choisissez une vidéo</Text>
            <Text style={styles.pickerSub}>60 sec max · 100MB · MP4, MOV</Text>
            <View style={styles.pickerBtns}>
              <Button
                mode="contained"
                onPress={() => requestAndPick(false)}
                buttonColor="#E85D04"
                style={styles.pickerBtn}
                icon="image-multiple"
              >
                Galerie
              </Button>
              <Button
                mode="outlined"
                onPress={() => requestAndPick(true)}
                style={styles.pickerBtn}
                icon="camera"
              >
                Caméra
              </Button>
            </View>
          </View>
        )}

        <TextInput
          placeholder="Description..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={500}
          style={styles.descInput}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>

        <ErrorMessage message={error} />

        <Button
          mode="contained"
          onPress={handlePublish}
          loading={isUploading}
          disabled={isUploading || !videoUri || !description.trim()}
          buttonColor="#E85D04"
          style={styles.publishBtn}
          contentStyle={{ paddingVertical: 8 }}
        >
          {isUploading ? 'Publication en cours…' : '🚀 Publier'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cancel: { color: '#666', fontSize: 15 },
  title: { fontWeight: 'bold', color: '#E85D04' },
  videoBox: {
    height: 360,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#000',
  },
  videoPreview: { width: '100%', height: '100%' },
  changeBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  changeBtnText: { color: '#fff', fontSize: 12 },
  picker: {
    height: 240,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E85D04',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFF7ED',
    gap: 8,
  },
  pickerIcon: { fontSize: 44 },
  pickerTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  pickerSub: { fontSize: 12, color: '#9CA3AF' },
  pickerBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  pickerBtn: { minWidth: 110 },
  descInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 4,
    minHeight: 100,
  },
  charCount: {
    textAlign: 'right',
    color: '#9CA3AF',
    fontSize: 11,
    marginBottom: 12,
  },
  publishBtn: { marginTop: 8 },
});
```

### Analyse

| Question | Réponse |
|----------|---------|
| **Bouton Galerie déclenche expo-image-picker ?** | Oui : `onPress={() => requestAndPick(false)}` → `launchImageLibraryAsync` |
| **Bouton Caméra déclenche expo-image-picker ?** | Oui : `onPress={() => requestAndPick(true)}` → `launchCameraAsync` |
| **Permissions demandées ?** | Oui : `requestCameraPermissionsAsync` et `requestMediaLibraryPermissionsAsync` |
| **Preview vidéo/image ?** | Oui : `VideoPreview` avec `VideoView` si `videoUri` est défini |
| **Bouton Publier envoie FormData ?** | Oui : `postsApi.create({ description, videoUri, thumbnailUri })` → FormData |

### Bugs identifiés

1. **`mediaTypes: ['video']` invalide**  
   - expo-image-picker attend `MediaType = 'images' | 'videos' | 'livePhotos'` (pluriel).  
   - `['video']` n’est pas valide ; il faut utiliser `['videos']` ou `ImagePicker.MediaTypeOptions.Videos`.

2. **Images non supportées**  
   - L’écran ne gère que les vidéos (`mediaTypes: ['video']`).  
   - Les images ne sont pas prises en charge.

3. **Upload possiblement cassé**  
   - Voir section 7 : `Content-Type` défini manuellement dans `posts.api.ts` peut casser l’upload.

---

## 2. PERMISSIONS (app.json)

### Contenu exact de app.json

```json
{
  "expo": {
    "name": "PICPEC",
    "slug": "picpec",
    "scheme": "picpec",
    "version": "1.0.0",
    "platforms": ["ios", "android", "web"],
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "assetBundlePatterns": ["**/*"],
    "plugins": [
      "expo-router",
      "expo-secure-store",
      ["expo-av", { "microphonePermission": "Accès micro pour les vidéos" }],
      ["expo-image-picker", { "photosPermission": "Accès photos" }],
      [
        "expo-media-library",
        {
          "photosPermission": "Accès galerie",
          "savePhotosPermission": "Sauvegarder des vidéos",
          "isAccessMediaLocationEnabled": true
        }
      ],
      "expo-video",
      "@react-native-community/datetimepicker"
    ],
    "experiments": { "typedRoutes": true },
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#E85D04"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.picpec.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#E85D04"
      },
      "package": "com.picpec.app"
    }
  }
}
```

### Analyse des permissions

| Permission | iOS | Android | Statut |
|------------|-----|---------|--------|
| **expo-image-picker** | | | |
| `photosPermission` | NSPhotoLibraryUsageDescription | READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, CAMERA (via plugin) | ✅ Configuré |
| `cameraPermission` | NSCameraUsageDescription | CAMERA | ❌ Manquant |
| **expo-media-library** | | | |
| `photosPermission` | NSPhotoLibraryUsageDescription | READ_MEDIA_IMAGES, READ_MEDIA_VIDEO | ✅ Configuré |
| `savePhotosPermission` | NSPhotoLibraryAddUsageDescription | WRITE_EXTERNAL_STORAGE | ✅ Configuré |

### Recommandation

Ajouter `cameraPermission` pour expo-image-picker :

```json
["expo-image-picker", {
  "photosPermission": "Accès photos",
  "cameraPermission": "Accès caméra pour enregistrer des vidéos"
}]
```

---

## 3. VIDEOPLAYER (VideoPlayer.tsx)

### Contenu complet du fichier

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Pressable,
  Image,
  ActivityIndicator,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  isActive: boolean;
  preload?: boolean;
  onProgressUpdate?: (progress: number, duration: number) => void;
}

export const VideoPlayer = ({
  videoUrl,
  thumbnailUrl,
  isActive,
  preload = false,
  onProgressUpdate,
}: VideoPlayerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(!!thumbnailUrl);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  const player = useVideoPlayer(
    isActive || preload ? { uri: videoUrl } : null,
    (p) => {
      p.loop = true;
      p.muted = isMuted;
    },
  );

  useEffect(() => {
    if (!player) return;
    if (isActive && !isPaused) {
      player.play();
      setShowThumbnail(false);
    } else {
      player.pause();
    }
  }, [isActive, isPaused, player]);

  useEffect(() => {
    if (player) player.muted = isMuted;
  }, [isMuted, player]);

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('statusChange', (status) => {
      if (status.status === 'readyToPlay') {
        setIsLoading(false);
        setShowThumbnail(false);
      }
      if (status.status === 'error') {
        setHasError(true);
        setIsLoading(false);
      }
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    if (!player || !isActive) return;
    const interval = setInterval(() => {
      try {
        const current = (player as { currentTime?: number }).currentTime ?? 0;
        const total = (player as { duration?: number }).duration ?? 0;
        if (total > 0) {
          const ratio = current / total;
          setProgress(ratio);
          onProgressUpdate?.(ratio, total);
        }
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearInterval(interval);
  }, [player, isActive, onProgressUpdate]);

  const handlePress = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const toggleMute = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
  }, []);

  if (hasError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>❌ Vidéo indisponible</Text>
      </View>
    );
  }

  if (!videoUrl) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholderText}>🎬 Vidéo en cours…</Text>
      </View>
    );
  }

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      {(showThumbnail || !isActive) && thumbnailUrl && (
        <Image
          source={{ uri: thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      {isActive && player && (
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
        />
      )}

      {isLoading && isActive && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {isPaused && !isLoading && (
        <View style={styles.overlay}>
          <Text style={styles.pauseIcon}>⏸</Text>
        </View>
      )}

      <Pressable style={styles.muteBtn} onPress={toggleMute} hitSlop={12}>
        <Text style={styles.muteIcon}>{isMuted ? '🔇' : '🔊'}</Text>
      </Pressable>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 32,
    textAlign: 'center',
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
  },
  pauseIcon: {
    fontSize: 52,
    color: '#fff',
  },
  muteBtn: {
    position: 'absolute',
    top: 56,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteIcon: {
    fontSize: 16,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  progressFill: {
    height: 2,
    backgroundColor: '#E85D04',
    minWidth: 2,
  },
});
```

### Analyse

| Question | Réponse |
|----------|---------|
| **`isActive` passée depuis PostCard ?** | Oui : `isActive={isActive}` |
| **expo-video installé ?** | Oui : `"expo-video": "~2.0.6"` dans package.json |
| **useVideoPlayer utilisé ?** | Oui : `useVideoPlayer(isActive \|\| preload ? { uri: videoUrl } : null, ...)` |
| **VideoView reçoit le player ?** | Oui : `player={player}` |

### Attention

- `e.stopPropagation()` en React Native ne fonctionne pas comme sur le web. Le bouton mute peut ne pas toujours empêcher la propagation vers le parent.
- Les overlays (`isLoading`, `isPaused`) n’ont pas de `pointerEvents` : les touches peuvent passer au parent `Pressable`.

---

## 4. POSTCARD (PostCard.tsx)

### Contenu complet du fichier

Voir le fichier source complet (316 lignes).

### Analyse des boutons

| Bouton | onPress | Statut |
|--------|---------|--------|
| Like | `handleLike` | ✅ Défini |
| Commentaire | `router.push(...)` | ✅ Défini |
| Partager | `handleShare` | ✅ Défini |
| Investir | `handleInvest` | ✅ Défini |
| Signaler | `handleReport` | ✅ Défini |
| Suivre | `handleFollow` | ✅ Défini |

### pointerEvents

- `overlayLeft` : `pointerEvents="box-none"` → les touches passent aux enfants.
- `overlayRight` : pas de `pointerEvents` → `auto` par défaut, les touches sont capturées par la vue.

### VideoPlayer et isActive

- `VideoPlayer` reçoit bien `isActive={isActive}`.

### Overlays et position absolue

- `overlayLeft` et `overlayRight` sont en `position: absolute`, `bottom: 96`, au-dessus du vidéo.
- Ils sont rendus après le `VideoPlayer` dans le DOM, donc au-dessus de la vidéo.
- Aucun overlay plein écran masquant les boutons.

### Conclusion PostCard

- Pas de problème évident dans les handlers ou la structure des overlays.
- Si les boutons ne répondent pas, vérifier :
  - `viewabilityConfig` / `onViewableItemsChanged` (FlashList).
  - Problème de scroll ou de touch sur le parent.

---

## 5. HOMESCREEN (home.tsx)

### Contenu complet du fichier

Voir le fichier source complet (187 lignes).

### Analyse

| Question | Réponse |
|----------|---------|
| **FlashList passe isActive ?** | Oui : `isActive={index === activeIndex}` |
| **Overlay plein écran ?** | Non : le FAB est en `position: absolute` en haut à droite, pas de masque plein écran |
| **onViewableItemsChanged ?** | Oui : `onViewableItemsChanged={onViewableItemsChanged}` avec `viewabilityConfig` |

### Problème potentiel : viewabilityConfig

```tsx
const viewabilityConfig = useRef({
  itemVisiblePercentThreshold: 75,
  minimumViewTime: 200,
});
// ...
viewabilityConfig={viewabilityConfig.current}
```

- FlashList a eu des bugs avec `onViewableItemsChanged` et les callbacks.
- Utiliser `viewabilityConfig.current` peut empêcher les mises à jour.
- Recommandation : `viewabilityConfigCallbackPairs` ou passer un objet stable (non `ref`).

---

## 6. ERREURS CONSOLE

- Pas de logs Metro/Expo disponibles dans l’analyse.
- À vérifier manuellement :
  - Erreurs "non-serializable value in navigation"
  - Erreurs "Unable to resolve module" liées à expo-video ou expo-image-picker
  - Erreurs 400/422 lors de l’upload

---

## 7. POSTS API (posts.api.ts)

### Contenu complet du fichier

```ts
import api from './client';
import { Post, PaginatedResult } from '../types';

export const postsApi = {
  getFeed: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResult<Post>>('/posts', { params }),

  getById: (id: string) => api.get<Post>(`/posts/${id}`),

  create: async (data: {
    description: string;
    videoUri: string;
    thumbnailUri?: string;
  }) => {
    const formData = new FormData();

    if (data.description) {
      formData.append('description', data.description);
    }

    const filename = data.videoUri.split('/').pop() ?? 'video.mp4';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'mp4';
    const mimeTypes: Record<string, string> = {
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      webm: 'video/webm',
    };
    const type = mimeTypes[ext] ?? 'video/mp4';

    formData.append('video', {
      uri: data.videoUri,
      name: filename,
      type,
    } as unknown as Blob);

    if (data.thumbnailUri) {
      const thumbName = data.thumbnailUri.split('/').pop() ?? 'thumbnail.jpg';
      formData.append('thumbnail', {
        uri: data.thumbnailUri,
        name: thumbName,
        type: 'image/jpeg',
      } as unknown as Blob);
    }

    return api.post<Post>('/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // ... reste des méthodes
};
```

### Bug critique : Content-Type

```ts
return api.post<Post>('/posts', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

- **Problème** : définir `Content-Type: multipart/form-data` manuellement empêche axios d’ajouter le `boundary` (ex. `multipart/form-data; boundary=----WebKitFormBoundary...`).
- **Conséquence** : le serveur ne peut pas parser correctement le FormData.

### Client axios (client.ts)

```ts
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});
```

- L’intercepteur ne modifie pas le `Content-Type`.
- L’appel passe `headers: { 'Content-Type': 'multipart/form-data' }`, qui remplace le contenu par défaut.

### Correction recommandée

Ne pas définir `Content-Type` pour les requêtes FormData :

```ts
return api.post<Post>('/posts', formData, {
  headers: {
    'Content-Type': undefined, // ou ne pas inclure
  },
  transformRequest: [(data, headers) => {
    if (data instanceof FormData) {
      delete headers['Content-Type'];
      return data;
    }
    return data;
  }],
});
```

Ou plus simplement :

```ts
return api.post<Post>('/posts', formData, {
  headers: data instanceof FormData ? {} : { 'Content-Type': 'application/json' },
});
```

En pratique, pour axios, quand `data` est un FormData, ne pas passer de `Content-Type` :

```ts
return api.post<Post>('/posts', formData, {
  headers: {
    ...(Object.keys(config.headers || {}).filter(k => k.toLowerCase() !== 'content-type')),
  },
});
```

Solution la plus simple :

```ts
// Dans posts.api.ts create()
return api.post<Post>('/posts', formData, {
  headers: {
    'Content-Type': undefined, // ou supprimer
  },
});
```

En fait, pour axios, la solution la plus simple est de :

1. Ne pas passer `headers` pour les requêtes FormData, ou
2. Modifier l’intercepteur pour retirer `Content-Type` quand `data` est un FormData.

### Format FormData

- Format `{ uri, name, type }` pour les fichiers dans React Native : correct.
- `formData.append('file', { uri, name, type })` est valide.

---

## 8. BACKEND (posts.controller.ts + posts.service.ts)

### posts.controller.ts

- `FileFieldsInterceptor` configuré pour `video` et `thumbnail`.
- `diskStorage` : uploads dans `uploads/`.
- `@Post()` avec `@UseInterceptors(FileFieldsInterceptor(...))`.
- Accepte bien le multipart.

### posts.service.ts

- Crée le post en base Prisma.
- Supporte Cloudinary si configuré.
- Génération de thumbnail via ffmpeg si absent.

### Conclusion backend

- Pas de problème côté backend pour l’acceptation du multipart.
- Les erreurs 400/422 sont probablement dues à un FormData mal formé (boundary manquant).
- Vérifier les logs backend lors d’un upload.

---

## 9. PLAN DE CORRECTIONS

### Priorité 1 (Critique)

1. **posts.api.ts**  
   Supprimer ou ne pas définir `Content-Type` pour les requêtes FormData :

   ```ts
   return api.post<Post>('/posts', formData, {
     headers: data instanceof FormData ? {} : { 'Content-Type': 'application/json' },
   });
   ```

   Ou mieux : adapter l’intercepteur pour retirer `Content-Type` quand `data` est un FormData.

2. **create-post.tsx**  
   Corriger `mediaTypes` :

   ```ts
   mediaTypes: ImagePicker.MediaTypeOptions.Videos
   // ou
   mediaTypes: ['videos']
   ```

### Priorité 2 (Important)

3. **app.json**  
   Ajouter `cameraPermission` pour expo-image-picker.

4. **Support des images**  
   Si vous voulez accepter images et vidéos :

   ```ts
   mediaTypes: ImagePicker.MediaTypeOptions.All
   // ou
   mediaTypes: ['images', 'videos']
   ```

### Priorité 3 (À vérifier)

5. **home.tsx**  
   Tester `viewabilityConfigCallbackPairs` ou un objet stable si `onViewableItemsChanged` ne se déclenche pas correctement.

6. **Console**  
   Reproduire les bugs et vérifier les erreurs Metro/Expo.

---

## 10. FICHIERS UTILES POUR VÉRIFICATION

| Fichier | Chemin |
|---------|--------|
| create-post | `mobile-app/app/create-post.tsx` |
| posts.api | `mobile-app/src/api/posts.api.ts` |
| client | `mobile-app/src/api/client.ts` |
| VideoPlayer | `mobile-app/src/components/feed/VideoPlayer.tsx` |
| PostCard | `mobile-app/src/components/feed/PostCard.tsx` |
| home | `mobile-app/app/(tabs)/home.tsx` |
| app.json | `mobile-app/app.json` |
| posts.controller | `backend/src/posts/posts.controller.ts` |
| posts.service | `backend/src/posts/posts.service.ts` |

---

*Rapport généré automatiquement.*
