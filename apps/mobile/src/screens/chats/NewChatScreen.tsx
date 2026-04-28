import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Avatar } from '../../components/Avatar';
import { apiClient } from '../../api/client';
import * as chatsApi from '../../api/chats.api';
import { useChatStore } from '../../stores/chat.store';
import { useOrganizationStore } from '../../stores/organization.store';
import { useTheme } from '../../theme';
import type { ChatStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ChatStackParamList, 'NewChat'>;

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

export function NewChatScreen({ navigation }: Props) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const addChat = useChatStore((state) => state.addChat);
  const currentOrg = useOrganizationStore((state) => state.currentOrg);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setIsSearching(true);
      const { data } = await apiClient.get<User[]>('/users/search', { params: { q: query.trim() } });
      setSearchResults(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const toggleMember = useCallback((user: User) => {
    setSelectedMembers((prev) => {
      const exists = prev.find((m) => m.id === user.id);
      if (exists) return prev.filter((m) => m.id !== user.id);
      return [...prev, user];
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (selectedMembers.length === 0) {
      Alert.alert('Заполните форму', 'Выберите хотя бы одного участника.');
      return;
    }

    const isGroup = selectedMembers.length > 1;
    if (isGroup && !groupName.trim()) {
      Alert.alert('Название группы', 'Введите название группы.');
      return;
    }

    if (!currentOrg?.id) {
      Alert.alert('Подождите', 'Организация ещё загружается.');
      return;
    }

    try {
      setIsCreating(true);
      const chat = await chatsApi.createChat({
        type: isGroup ? 'GROUP' : 'PERSONAL',
        name: isGroup ? groupName.trim() : undefined,
        memberIds: selectedMembers.map((m) => m.id),
        organizationId: currentOrg.id,
      });
      addChat(chat);
      navigation.replace('ChatView', { chatId: chat.id });
    } catch (err: any) {
      Alert.alert('Ошибка', err.response?.data?.message || 'Не удалось создать чат.');
    } finally {
      setIsCreating(false);
    }
  }, [currentOrg?.id, selectedMembers, groupName, addChat, navigation]);

  const isSelected = useCallback(
    (userId: string) => selectedMembers.some((m) => m.id === userId),
    [selectedMembers],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {selectedMembers.length > 1 && (
        <View style={styles.groupNameContainer}>
          <TextInput
            style={[
              styles.groupNameInput,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary },
            ]}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Название группы"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>
      )}

      {selectedMembers.length > 0 && (
        <View style={styles.selectedContainer}>
          {selectedMembers.map((member) => (
            <Pressable
              key={member.id}
              style={[styles.selectedChip, { backgroundColor: theme.colors.surfaceSoft, borderColor: theme.colors.borderStrong }]}
              onPress={() => toggleMember(member)}
            >
              <Text style={[styles.selectedChipText, { color: theme.colors.primary }]}>
                {member.firstName} {member.lastName}
              </Text>
              <Ionicons name="close" size={14} color={theme.colors.primary} />
            </Pressable>
          ))}
        </View>
      )}

      <View style={[styles.searchContainer, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.searchWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Найти участников…"
            placeholderTextColor={theme.colors.textTertiary}
            autoFocus
          />
        </View>
      </View>

      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const selected = isSelected(item.id);
          return (
            <Pressable
              style={({ pressed }) => [
                styles.userRow,
                {
                  borderBottomColor: theme.colors.border,
                  backgroundColor: selected ? theme.colors.surfaceSoft : pressed ? theme.colors.surfaceSoft : 'transparent',
                },
              ]}
              onPress={() => toggleMember(item)}
            >
              <Avatar name={`${item.firstName} ${item.lastName}`} uri={item.avatarUrl} size={40} />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.colors.textPrimary }]}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>{item.email}</Text>
              </View>
              {selected && <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />}
            </Pressable>
          );
        }}
        ListEmptyComponent={isSearching ? <ActivityIndicator style={styles.loader} color={theme.colors.primary} /> : null}
      />

      {selectedMembers.length > 0 && (
        <Pressable
          style={({ pressed }) => [
            styles.createButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: isCreating ? 0.6 : pressed ? 0.85 : 1,
              ...theme.shadows.md,
            },
          ]}
          onPress={handleCreate}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Text style={[styles.createButtonText, { color: theme.colors.onPrimary }]}>
              {selectedMembers.length > 1 ? 'Создать группу' : 'Начать диалог'}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  groupNameContainer: { paddingHorizontal: 16, paddingTop: 12 },
  groupNameInput: { height: 46, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, fontSize: 15 },
  selectedContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 8, gap: 6 },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedChipText: { fontSize: 13, fontWeight: '600' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchWrap: {
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 15, fontWeight: '600' },
  userEmail: { fontSize: 13, marginTop: 1 },
  loader: { paddingVertical: 24 },
  createButton: {
    marginHorizontal: 16,
    marginBottom: 24,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: { fontSize: 15, fontWeight: '700' },
});
