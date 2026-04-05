import type { Chat } from '@/stores/chat.store';

export function getChatDisplayName(chat: Chat, currentUserId?: string): string {
  if (chat.name) return chat.name;

  // For PERSONAL chats, show the other person's name
  if (chat.type === 'PERSONAL' && chat.members?.length > 0) {
    const other = chat.members.find(
      (m) => m.user && m.userId !== currentUserId,
    );
    if (other?.user) {
      return `${other.user.firstName} ${other.user.lastName}`.trim();
    }
  }

  // Fallback for group chats without name
  if (chat.members?.length > 0) {
    const names = chat.members
      .filter((m) => m.user && m.userId !== currentUserId)
      .slice(0, 3)
      .map((m) => m.user!.firstName);
    if (names.length > 0) return names.join(', ');
  }

  return 'Chat';
}
