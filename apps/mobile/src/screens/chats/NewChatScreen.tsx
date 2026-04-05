import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Avatar } from '../../components/Avatar';
import { apiClient } from '../../api/client';
import * as chatsApi from '../../api/chats.api';
import { useChatStore } from '../../stores/chat.store';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const addChat = useChatStore((state) => state.addChat);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const { data } = await apiClient.get<User[]>('/users/search', {
        params: { q: query.trim() },
      });
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
      Alert.alert('Error', 'Please select at least one member');
      return;
    }

    const isGroup = selectedMembers.length > 1;
    if (isGroup && !groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    try {
      setIsCreating(true);
      const chat = await chatsApi.createChat({
        type: isGroup ? 'group' : 'direct',
        name: isGroup ? groupName.trim() : undefined,
        memberIds: selectedMembers.map((m) => m.id),
      });
      addChat(chat);
      navigation.replace('ChatView', { chatId: chat.id });
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create chat');
    } finally {
      setIsCreating(false);
    }
  }, [selectedMembers, groupName, addChat, navigation]);

  const isSelected = useCallback(
    (userId: string) => selectedMembers.some((m) => m.id === userId),
    [selectedMembers],
  );

  return (
    <View style={styles.container}>
      {selectedMembers.length > 1 && (
        <View style={styles.groupNameContainer}>
          <TextInput
            style={styles.groupNameInput}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Group name"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      )}

      {selectedMembers.length > 0 && (
        <View style={styles.selectedContainer}>
          {selectedMembers.map((member) => (
            <Pressable
              key={member.id}
              style={styles.selectedChip}
              onPress={() => toggleMember(member)}
            >
              <Text style={styles.selectedChipText}>
                {member.firstName} {member.lastName} x
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search users..."
          placeholderTextColor="#9CA3AF"
          autoFocus
        />
      </View>

      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.userRow, isSelected(item.id) && styles.userRowSelected]}
            onPress={() => toggleMember(item)}
          >
            <Avatar name={`${item.firstName} ${item.lastName}`} uri={item.avatarUrl} size={40} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {item.firstName} {item.lastName}
              </Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            {isSelected(item.id) && <Text style={styles.checkmark}>check</Text>}
          </Pressable>
        )}
        ListEmptyComponent={
          isSearching ? (
            <ActivityIndicator style={styles.loader} color="#4F46E5" />
          ) : null
        }
      />

      {selectedMembers.length > 0 && (
        <Pressable
          style={[styles.createButton, isCreating && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>
              {selectedMembers.length > 1 ? 'Create Group' : 'Start Chat'}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  groupNameContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  groupNameInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
  },
  selectedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 6,
  },
  selectedChip: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedChipText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  userRowSelected: {
    backgroundColor: '#EEF2FF',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  checkmark: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  loader: {
    paddingVertical: 24,
  },
  createButton: {
    marginHorizontal: 16,
    marginBottom: 24,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
