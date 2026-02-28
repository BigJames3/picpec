import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFeedStore } from '../src/store/feed.store';
import { postsApi } from '../src/api/posts.api';
import { ErrorMessage } from '../src/components/ui/ErrorMessage';

const VideoPreview = ({ uri }: { uri: string }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  return (
    <View style={styles.previewWrapper}>
      <VideoView
        player={player}
        style={styles.videoPreview}
        contentFit="cover"
        nativeControls={false}
      />

      {isPaused && (
        <View style={styles.pausedOverlay} pointerEvents="none">
          <Ionicons
            name="pause-circle"
            size={72}
            color="rgba(255,255,255,0.9)"
          />
        </View>
      )}

      <View style={styles.videoControls}>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => {
            player.muted = !isMuted;
            setIsMuted((m) => !m);
          }}
        >
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => {
            if (isPaused) {
              player.play();
            } else {
              player.pause();
            }
            setIsPaused((p) => !p);
          }}
        >
          <Ionicons
            name={isPaused ? 'play' : 'pause'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.videoBadge}>
        <Ionicons name="videocam" size={12} color="#fff" />
        <Text style={styles.videoBadgeText}>VIDÉO</Text>
      </View>
    </View>
  );
};

export default function CreatePostScreen() {
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'image' | null>(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
          mediaTypes: ['images', 'videos'],
          allowsEditing: false,
          quality: 1,
          videoMaxDuration: 60,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          allowsEditing: false,
          quality: 1,
        });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const isVideo =
      asset.type === 'video' ||
      /\.(mp4|mov|avi|webm|mkv|3gp|m4v|wmv|flv|ogv|ts|mts|m2ts)(\?|$)/i.test(
        asset.uri ?? '',
      );
    const isImage =
      asset.type === 'image' ||
      /\.(jpg|jpeg|png|gif|webp|heic|heif|avif|bmp|tiff|tif)(\?|$)/i.test(
        asset.uri ?? '',
      );
    if (!isVideo && !isImage) {
      setError('Format non supporté. Utilisez une image ou une vidéo.');
      return;
    }
    if (isVideo && asset.fileSize && asset.fileSize > 500 * 1024 * 1024) {
      setError('Vidéo trop lourde (max 500MB). Essayez une vidéo plus courte.');
      return;
    }
    setMediaUri(asset.uri);
    setMediaType(isVideo ? 'video' : 'image');
    setError('');
  };

  const handlePublish = async () => {
    if (!mediaUri || !mediaType) {
      setError('Choisissez ou enregistrez un média (image ou vidéo).');
      return;
    }
    if (!description.trim()) {
      setError('Ajoutez une description.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');
    try {
      if (mediaType === 'video') {
        let thumbnailUri: string | undefined;
        try {
          const { uri } = await getThumbnailAsync(mediaUri, { time: 1000 });
          thumbnailUri = uri;
        } catch {
          /* ignore */
        }
        await postsApi.create({
          description: description.trim(),
          videoUri: mediaUri,
          thumbnailUri,
          mediaType: 'video',
          onProgress: (percent) => {
            setUploadProgress(percent);
            console.log(`[Upload] Progression : ${percent}%`);
          },
        });
      } else {
        await postsApi.create({
          description: description.trim(),
          imageUri: mediaUri,
          mediaType: 'image',
          onProgress: (percent) => {
            setUploadProgress(percent);
            console.log(`[Upload] Progression : ${percent}%`);
          },
        });
      }
      Alert.alert('✅ Publié !', 'Votre contenu est en ligne.', [
        {
          text: 'Voir le feed',
          onPress: () => {
            // 1. Forcer lastFetchAt=0 pour que
            //    useFocusEffect re-fetche
            useFeedStore.getState().reset();

            // 2. Naviguer immédiatement
            //    useFocusEffect dans home.tsx
            //    s'occupera du fetch
            router.replace('/(tabs)/home');
          },
        },
      ]);
    } catch (err: unknown) {
      const e = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      console.error('[Create Post] Erreur complète :', {
        status: e?.response?.status,
        message: e?.response?.data?.message,
        data: e?.response?.data,
      });
      setError(
        e?.response?.data?.message ??
          `Erreur ${e?.response?.status ?? ''} lors de la publication`,
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>Nouveau post</Text>

        <TouchableOpacity
          style={[
            styles.publishBtn,
            (!mediaUri || !description.trim() || isUploading) &&
              styles.publishBtnDisabled,
          ]}
          onPress={handlePublish}
          disabled={isUploading || !mediaUri || !description.trim()}
        >
          {isUploading ? (
            <Text style={styles.publishBtnText}>{uploadProgress}%</Text>
          ) : (
            <Text style={styles.publishBtnText}>Publier</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {mediaUri ? (
          <View style={styles.mediaBox}>
            {mediaType === 'video' ? (
              <VideoPreview uri={mediaUri} />
            ) : (
              <Image
                source={{ uri: mediaUri }}
                style={styles.videoPreview}
                resizeMode="cover"
              />
            )}

            <TouchableOpacity
              style={styles.changeBtn}
              onPress={() => requestAndPick(false)}
            >
              <Ionicons name="sync" size={14} color="#fff" />
              <Text style={styles.changeBtnText}>Changer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.picker}>
            <TouchableOpacity
              style={styles.galleryBtn}
              onPress={() => requestAndPick(false)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#E85D04', '#FF8C42']}
                style={styles.galleryBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="images" size={32} color="#fff" />
                <Text style={styles.galleryBtnText}>Galerie</Text>
                <Text style={styles.galleryBtnSub}>Photo ou Vidéo</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={() => requestAndPick(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={24} color="#E85D04" />
              <Text style={styles.cameraBtnText}>Caméra</Text>
            </TouchableOpacity>

            <Text style={styles.pickerSub}>
              📹 Vidéo 60s max · 500MB · 🖼️ Tous formats
            </Text>
          </View>
        )}

        <View style={styles.descContainer}>
          <Text style={styles.descLabel}>Description</Text>
          <TextInput
            placeholder="Décrivez votre contenu..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
            style={styles.descInput}
          />
          <Text
            style={[
              styles.charCount,
              description.length > 450 && styles.charCountWarn,
            ]}
          >
            {description.length}/500
          </Text>
        </View>

        {isUploading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                {uploadProgress < 100
                  ? '⬆️ Upload en cours...'
                  : '⚙️ Traitement...'}
              </Text>
              <Text style={styles.progressPercent}>{uploadProgress}%</Text>
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${uploadProgress}%` },
                ]}
              />
            </View>

            <Text style={styles.progressSub}>
              {uploadProgress < 30 && 'Connexion à Cloudinary...'}
              {uploadProgress >= 30 &&
                uploadProgress < 70 &&
                'Envoi de la vidéo...'}
              {uploadProgress >= 70 &&
                uploadProgress < 100 &&
                'Finalisation...'}
              {uploadProgress === 100 && 'Génération HLS en cours...'}
            </Text>
          </View>
        )}

        <ErrorMessage message={error} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  cancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  publishBtn: {
    backgroundColor: '#E85D04',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  publishBtnDisabled: {
    backgroundColor: '#4a2800',
    opacity: 0.6,
  },
  publishBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  scroll: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
  },

  mediaBox: {
    height: 480,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },

  previewWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoControls: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(232,93,4,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  videoBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  changeBtn: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  picker: {
    height: 280,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2a2a2a',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    gap: 12,
  },
  galleryBtn: {
    width: 140,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
  },
  galleryBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  galleryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  galleryBtnSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E85D04',
  },
  cameraBtnText: {
    color: '#E85D04',
    fontWeight: '600',
    fontSize: 14,
  },
  pickerSub: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },

  descContainer: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  descLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  descInput: {
    color: '#fff',
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    color: '#666',
    fontSize: 11,
  },
  charCountWarn: {
    color: '#E85D04',
  },

  progressContainer: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  progressPercent: {
    color: '#E85D04',
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#E85D04',
    borderRadius: 3,
  },
  progressSub: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
  },
});
