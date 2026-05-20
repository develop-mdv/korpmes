import React, { useState, useCallback, memo, useMemo, useRef } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, Alert, ScrollView, Image, GestureResponderEvent, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getChatCommandSuggestions,
  type ChatCommandSuggestion,
} from '@corp/shared-constants';
import type { StagedAttachment, StagingInput } from '../hooks/useAttachmentStaging';
import type { FileDisplayMode } from '../api/files.api';
import { useVoiceRecorder, type VoiceRecording } from '../hooks/useVoiceRecorder';
import { RecordingBar } from './RecordingBar';
import * as ImagePicker from 'expo-image-picker';
// @ts-ignore - expo-document-picker types may not resolve until full install
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../theme';

interface MessageInputProps {
  onSend: (text: string) => boolean | void | Promise<boolean | void>;
  onAttach?: (files: StagingInput[], mode: FileDisplayMode) => void;
  onSendVoice?: (rec: VoiceRecording) => void;
  onOpenVideoNote?: () => void;
  stagedFiles?: StagedAttachment[];
  onRemoveStaged?: (localId: string) => void;
  disableSend?: boolean;
  placeholder?: string;
  feedback?: ComposerFeedback | null;
}

interface ComposerFeedback {
  tone: 'success' | 'error' | 'info';
  message: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function pickImages(): Promise<StagingInput[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    allowsMultipleSelection: true,
    quality: 0.8,
  });
  if (result.canceled) return [];
  return result.assets.map((a: any) => ({
    uri: a.uri,
    name: a.fileName || `image-${Date.now()}.${String(a.uri).split('.').pop() || 'jpg'}`,
    mimeType: a.mimeType || (a.type === 'video' ? 'video/mp4' : 'image/jpeg'),
    sizeBytes: a.fileSize || 0,
  }));
}

async function takePhoto(): Promise<StagingInput[]> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return [];
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    quality: 0.8,
  });
  if (result.canceled) return [];
  return result.assets.map((a: any) => ({
    uri: a.uri,
    name: a.fileName || `photo-${Date.now()}.jpg`,
    mimeType: a.mimeType || 'image/jpeg',
    sizeBytes: a.fileSize || 0,
  }));
}

async function pickDocuments(): Promise<StagingInput[]> {
  const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
  if (result.canceled) return [];
  return result.assets.map((a: any) => ({
    uri: a.uri,
    name: a.name,
    mimeType: a.mimeType || 'application/octet-stream',
    sizeBytes: a.size || 0,
  }));
}

export const MessageInput = memo(function MessageInput({
  onSend,
  onAttach,
  onSendVoice,
  onOpenVideoNote,
  stagedFiles = [],
  onRemoveStaged,
  disableSend,
  placeholder = 'Напишите сообщение…',
  feedback = null,
}: MessageInputProps) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const hasReady = stagedFiles.some((s) => s.status === 'done');
  const canSend = !disableSend && (text.trim().length > 0 || hasReady);
  const commandSuggestions = useMemo(() => getChatCommandSuggestions(text), [text]);

  const recorder = useVoiceRecorder({
    onComplete: (rec) => {
      onSendVoice?.(rec);
    },
    onError: (err) => {
      console.warn('Voice recorder error:', err);
    },
  });
  const isRecording = recorder.state === 'recording' || recorder.state === 'locked';

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const result = await onSend(text.trim());
    if (result === false) return;
    setText('');
  }, [text, onSend, canSend]);

  const handleMicPressIn = (e: GestureResponderEvent) => {
    if (!onSendVoice) return;
    pressOriginRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    void recorder.start();
  };
  const handleMicMove = (e: GestureResponderEvent) => {
    if (!isRecording || recorder.state === 'locked' || !pressOriginRef.current) return;
    const dx = e.nativeEvent.pageX - pressOriginRef.current.x;
    const dy = e.nativeEvent.pageY - pressOriginRef.current.y;
    if (dx < -80) {
      void recorder.cancel();
      pressOriginRef.current = null;
      return;
    }
    if (dy < -50) {
      recorder.lock();
      pressOriginRef.current = null;
    }
  };
  const handleMicPressOut = () => {
    if (recorder.state === 'recording') {
      void recorder.stop();
    }
    pressOriginRef.current = null;
  };

  const openAttachMenu = useCallback(() => {
    if (!onAttach) return;
    Alert.alert(
      'Прикрепить',
      undefined,
      [
        {
          text: 'Фото / видео',
          onPress: async () => {
            const files = await pickImages().catch(() => []);
            if (files.length > 0) onAttach(files, 'media');
          },
        },
        {
          text: 'Снять фото',
          onPress: async () => {
            const files = await takePhoto().catch(() => []);
            if (files.length > 0) onAttach(files, 'media');
          },
        },
        {
          text: 'Изображение/видео как файл',
          onPress: async () => {
            const files = await pickImages().catch(() => []);
            if (files.length > 0) onAttach(files, 'file');
          },
        },
        {
          text: 'Документ',
          onPress: async () => {
            const files = await pickDocuments().catch(() => []);
            if (files.length > 0) onAttach(files, 'file');
          },
        },
        { text: 'Отмена', style: 'cancel' },
      ],
      { cancelable: true },
    );
  }, [onAttach]);

  const chooseCommand = useCallback((command: ChatCommandSuggestion) => {
    setText(`${command.command} `);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  return (
    <View>
      {commandSuggestions.length > 0 && !isRecording && (
        <View style={[styles.commandMenu, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {commandSuggestions.map((command) => (
            <Pressable
              key={command.name}
              style={({ pressed }) => [
                styles.commandItem,
                { backgroundColor: pressed ? theme.colors.surfaceSoft : 'transparent' },
              ]}
              onPress={() => chooseCommand(command)}
            >
              <Text style={[styles.commandName, { color: theme.colors.primary }]}>{command.command}</Text>
              <View style={styles.commandCopy}>
                <Text numberOfLines={1} style={[styles.commandTitle, { color: theme.colors.textPrimary }]}>
                  {command.title}
                </Text>
                <Text numberOfLines={1} style={[styles.commandDescription, { color: theme.colors.textSecondary }]}>
                  {command.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
      {feedback && !isRecording && (
        <View
          style={[
            styles.feedback,
            {
              backgroundColor:
                feedback.tone === 'success'
                  ? 'rgba(42, 153, 101, 0.13)'
                  : feedback.tone === 'error'
                    ? 'rgba(201, 78, 78, 0.12)'
                    : theme.colors.surfaceSoft,
              borderColor:
                feedback.tone === 'success'
                  ? 'rgba(42, 153, 101, 0.22)'
                  : feedback.tone === 'error'
                    ? 'rgba(201, 78, 78, 0.2)'
                    : theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.feedbackText,
              {
                color:
                  feedback.tone === 'success'
                    ? '#24744f'
                    : feedback.tone === 'error'
                      ? '#9a3737'
                      : theme.colors.textSecondary,
              },
            ]}
          >
            {feedback.message}
          </Text>
        </View>
      )}
      {stagedFiles.length > 0 && !isRecording && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[stripStyles.strip, { backgroundColor: theme.colors.bgSecondary, borderTopColor: theme.colors.border }]}
          contentContainerStyle={stripStyles.stripContent}
        >
          {stagedFiles.map((s) => {
            const isImage = s.mimeType.startsWith('image/');
            const isVideo = s.mimeType.startsWith('video/');
            const showThumb = s.displayMode === 'media' && (isImage || isVideo);
            const badgeText = s.displayMode === 'media' ? 'Медиа' : 'Файл';
            return (
              <View key={s.localId} style={[stripStyles.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                {showThumb ? (
                  <Image source={{ uri: s.uri }} style={stripStyles.thumb} />
                ) : (
                  <View style={[stripStyles.fileIcon, { backgroundColor: theme.colors.surfaceSoft }]}>
                    <Ionicons name="document-outline" size={20} color={theme.colors.textSecondary} />
                  </View>
                )}
                <View style={stripStyles.itemInfo}>
                  <Text numberOfLines={1} style={[stripStyles.itemName, { color: theme.colors.textPrimary }]}>
                    {s.name}
                  </Text>
                  <Text style={[stripStyles.itemMeta, { color: theme.colors.textTertiary }]}>
                    {badgeText} · {formatSize(s.sizeBytes)}
                    {s.status === 'uploading' && ` · ${s.progress}%`}
                    {s.status === 'error' && ` · ${s.error}`}
                  </Text>
                </View>
                <Pressable
                  style={[stripStyles.removeBtn, { backgroundColor: theme.colors.surfaceSoft }]}
                  onPress={() => onRemoveStaged?.(s.localId)}
                >
                  <Ionicons name="close" size={14} color={theme.colors.textPrimary} />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
      {isRecording ? (
        <RecordingBar
          state={recorder.state}
          elapsedMs={recorder.elapsedMs}
          amplitude={recorder.amplitude}
          onCancel={() => void recorder.cancel()}
          onSend={() => void recorder.stop()}
          onLock={recorder.lock}
        />
      ) : (
        <View style={[styles.container, { backgroundColor: theme.colors.bg, borderTopColor: theme.colors.border }]}>
          {onAttach && (
            <Pressable
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: theme.colors.surfaceSoft, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={openAttachMenu}
            >
              <Ionicons name="attach" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          )}
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
                borderColor: theme.colors.border,
              },
            ]}
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            maxLength={4000}
          />
          {onOpenVideoNote && !canSend && (
            <Pressable
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: theme.colors.surfaceSoft, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={onOpenVideoNote}
            >
              <Ionicons name="radio-button-on" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          )}
          {onSendVoice && !canSend ? (
            <Pressable
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPressIn={handleMicPressIn}
              onPressOut={handleMicPressOut}
              onTouchMove={handleMicMove}
            >
              <Ionicons name="mic" size={20} color={theme.colors.textSecondary} />
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: canSend ? theme.colors.primary : theme.colors.surfaceSoft,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={handleSend}
              disabled={!canSend}
            >
              <Ionicons
                name="send"
                size={18}
                color={canSend ? theme.colors.onPrimary : theme.colors.textTertiary}
              />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 130,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commandMenu: {
    marginHorizontal: 10,
    marginBottom: 8,
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  commandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  commandName: {
    width: 72,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  commandCopy: {
    flex: 1,
    minWidth: 0,
  },
  commandTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  commandDescription: {
    fontSize: 12,
    marginTop: 1,
  },
  feedback: {
    marginHorizontal: 10,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

const stripStyles = StyleSheet.create({
  strip: { borderTopWidth: StyleSheet.hairlineWidth, maxHeight: 78 },
  stripContent: { padding: 10, gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
    minWidth: 200,
    maxWidth: 260,
    gap: 8,
  },
  thumb: { width: 42, height: 42, borderRadius: 10 },
  fileIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 12, fontWeight: '600' },
  itemMeta: { fontSize: 11 },
  removeBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
