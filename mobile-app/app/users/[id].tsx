import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { theme } from '../../src/theme';
import { postsApi } from '../../src/api/posts.api';
import { Post } from '../../src/types';
import { PButton } from '../../src/components/ui/PButton';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 4;
const COLS = 2;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * (COLS + 1)) / COLS;

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<{
    id: string;
    fullName?: string;
    fullname?: string;
    avatar?: string;
  } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  const fetchUser = async () => {
    if (!id) return;
    try {
      const { data } = await postsApi.getFeed({ limit: 20 });
      const allPosts = data.data ?? [];
      const userPosts = allPosts.filter((p) => p.userId === id);
      const firstUser = userPosts[0]?.user ?? allPosts.find((p) => p.user?.id === id)?.user;
      if (firstUser) {
        setUser({
          id: firstUser.id,
          fullName: firstUser.fullName ?? (firstUser as { fullname?: string }).fullname,
          fullname: (firstUser as { fullname?: string }).fullname,
          avatar: firstUser.avatarUrl ?? firstUser.avatar,
        });
      } else {
        setUser({
          id,
          fullName: 'Utilisateur',
          fullname: 'Utilisateur',
        });
      }
      setPosts(userPosts);
    } catch {
      setUser({ id, fullName: 'Utilisateur', fullname: 'Utilisateur' });
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [id]);

  const getInitials = () => {
    const name = user?.fullName ?? user?.fullname ?? '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = () => {
    const hue = ((id?.charCodeAt(0) ?? 0) * 47) % 360;
    return `hsl(${hue}, 60%, 45%)`;
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {user?.fullName ?? user?.fullname ?? 'Profil'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        numColumns={COLS}
        columnWrapperStyle={styles.gridRow}
        ListHeaderComponent={
          <View style={styles.hero}>
            <View style={[styles.avatar, { backgroundColor: getAvatarColor() }]}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{getInitials()}</Text>
              )}
            </View>
            <Text style={styles.userName}>
              {user?.fullName ?? user?.fullname ?? 'Utilisateur'}
            </Text>
            <Text style={styles.handle}>
              @{(user?.fullName ?? user?.fullname ?? 'user').replace(/\s+/g, '_').toLowerCase()}
            </Text>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{posts.length}</Text>
                <Text style={styles.statLabel}>posts</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>followers</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>following</Text>
              </View>
            </View>
            <PButton
              label={following ? 'Abonné' : 'Suivre'}
              onPress={() => setFollowing(!following)}
              variant={following ? 'outline' : 'primary'}
              size="sm"
              style={styles.followBtn}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              title="Aucun post"
              subtitle="Cet utilisateur n'a pas encore publié"
              icon="📷"
            />
          </View>
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={styles.gridItem}
            onPress={() => router.push(`/posts/${item.id}/comments` as never)}
          >
            <View style={styles.postThumb}>
              {item.thumbnailUrl || item.videoUrl ? (
                <Image
                  source={{ uri: item.thumbnailUrl ?? item.videoUrl }}
                  style={styles.thumbImg}
                />
              ) : (
                <View
                  style={[
                    styles.thumbPlaceholder,
                    {
                      backgroundColor: `hsl(${(item.id.charCodeAt(0) * 47) % 360}, 40%, 25%)`,
                    },
                  ]}
                >
                  <Text style={styles.thumbEmoji}>🎬</Text>
                </View>
              )}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  backBtn: { fontSize: 24, color: theme.colors.primary, marginRight: 8 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.typography.size.lg,
    fontWeight: '600',
    color: theme.colors.black,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 28, fontWeight: '700', color: theme.colors.white },
  userName: {
    fontSize: theme.typography.size.xl,
    fontWeight: '700',
    color: theme.colors.black,
    marginBottom: 4,
  },
  handle: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray500,
    marginBottom: theme.spacing.lg,
  },
  stats: { flexDirection: 'row', gap: theme.spacing['2xl'], marginBottom: theme.spacing.lg },
  stat: { alignItems: 'center' },
  statValue: { fontSize: theme.typography.size.lg, fontWeight: '700', color: theme.colors.black },
  statLabel: { fontSize: theme.typography.size.xs, color: theme.colors.gray500 },
  followBtn: { minWidth: 120 },
  gridRow: { gap: GRID_GAP, paddingHorizontal: GRID_GAP / 2, marginBottom: GRID_GAP },
  gridItem: { width: ITEM_SIZE, height: ITEM_SIZE, marginHorizontal: GRID_GAP / 2 },
  postThumb: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: theme.colors.gray100,
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbEmoji: { fontSize: 32 },
  listContent: { paddingBottom: 48 },
  emptyWrap: { paddingVertical: theme.spacing['2xl'] },
});
