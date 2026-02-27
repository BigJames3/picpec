import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { theme } from '../../../src/theme';
import { postsApi } from '../../../src/api/posts.api';

interface Comment {
  id: string;
  content: string;
  userId: string;
  user?: { fullName?: string; fullname?: string };
  createdAt: string;
}

export default function CommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await postsApi.getComments(id, { limit: 50 });
      const items = (data as { data?: Comment[] })?.data ?? [];
      setComments(Array.isArray(items) ? items : []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !id || sending) return;
    setSending(true);
    try {
      await postsApi.addComment(id, trimmed);
      setInput('');
      await fetchComments();
    } catch {
      /* silent */
    } finally {
      setSending(false);
    }
  };

  const getInitials = (user?: { fullName?: string; fullname?: string }) => {
    const name = user?.fullName ?? user?.fullname ?? '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return d.toLocaleDateString('fr-FR');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          Commentaires ({comments.length})
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Chargement…</Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Aucun commentaire</Text>
                <Text style={styles.emptySub}>Soyez le premier à commenter</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: `hsl(${(item.userId.charCodeAt(0) * 47) % 360}, 60%, 45%)`,
                    },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {getInitials(item.user)}
                  </Text>
                </View>
                <View style={styles.commentBody}>
                  <Text style={styles.commentName}>
                    {item.user?.fullName ?? item.user?.fullname ?? 'Utilisateur'}
                  </Text>
                  <Text style={styles.commentDate}>
                    {formatDate(item.createdAt)}
                  </Text>
                  <Text style={styles.commentText}>{item.content}</Text>
                </View>
              </View>
            )}
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ajouter un commentaire..."
            placeholderTextColor={theme.colors.gray500}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || sending}
            style={[
              styles.sendBtn,
              (!input.trim() || sending) && styles.sendBtnDisabled,
            ]}
          >
            <Text style={styles.sendIcon}>→</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.white },
  flex: { flex: 1 },
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: theme.colors.gray500, fontSize: 14 },
  listContent: { padding: theme.spacing.lg, paddingBottom: 24 },
  empty: {
    paddingVertical: theme.spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.size.md,
    color: theme.colors.gray700,
    fontWeight: '500',
  },
  emptySub: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.gray500,
    marginTop: 4,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  commentBody: { flex: 1 },
  commentName: {
    fontSize: theme.typography.size.sm,
    fontWeight: '600',
    color: theme.colors.black,
  },
  commentDate: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.gray500,
    marginTop: 2,
  },
  commentText: {
    fontSize: theme.typography.size.base,
    color: theme.colors.gray700,
    marginTop: 4,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.size.md,
    color: theme.colors.black,
    backgroundColor: theme.colors.gray50,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendIcon: { color: theme.colors.white, fontSize: 20, fontWeight: '700' },
});
