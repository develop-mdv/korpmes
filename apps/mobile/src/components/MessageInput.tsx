import React, { useState, useCallback, memo } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet } from 'react-native';

interface MessageInputProps {
  onSend: (text: string) => void;
  onAttach?: () => void;
  placeholder?: string;
}

export const MessageInput = memo(function MessageInput({
  onSend,
  onAttach,
  placeholder = 'Type a message...',
}: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }, [text, onSend]);

  return (
    <View style={styles.container}>
      {onAttach && (
        <Pressable style={styles.iconButton} onPress={onAttach}>
          <Text style={styles.iconText}>+</Text>
        </Pressable>
      )}
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline
        maxLength={4000}
      />
      <Pressable
        style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={!text.trim()}
      >
        <Text style={[styles.sendText, !text.trim() && styles.sendTextDisabled]}>
          Send
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  iconText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: '600',
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    color: '#111827',
  },
  sendButton: {
    marginLeft: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  sendTextDisabled: {
    color: '#9CA3AF',
  },
});
