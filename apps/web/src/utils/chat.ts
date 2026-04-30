import type { Chat } from '@/stores/chat.store';

export function isSelfChat(chat: Chat, currentUserId?: string): boolean {
  if (!currentUserId || chat.type !== 'PERSONAL') return false;
  const members = chat.members ?? [];
  return members.length === 1 && members[0].userId === currentUserId;
}

export function getChatDisplayName(chat: Chat, currentUserId?: string): string {
  if (isSelfChat(chat, currentUserId)) return 'Сохранённые сообщения';

  if (chat.name) return chat.name;

  if (chat.type === 'PERSONAL' && chat.members?.length > 0) {
    const other = chat.members.find(
      (m) => m.user && m.userId !== currentUserId,
    );
    if (other?.user) {
      return `${other.user.firstName} ${other.user.lastName}`.trim();
    }
  }

  if (chat.members?.length > 0) {
    const names = chat.members
      .filter((m) => m.user && m.userId !== currentUserId)
      .slice(0, 3)
      .map((m) => m.user!.firstName);
    if (names.length > 0) return names.join(', ');
  }

  return 'Чат';
}
