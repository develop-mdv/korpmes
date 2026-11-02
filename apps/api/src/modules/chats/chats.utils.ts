import { Chat, ChatType } from './entities/chat.entity';

export function isSelfChat(
  chat: Pick<Chat, 'type'> & { members?: Array<{ userId: string; leftAt?: Date | null }> },
  userId: string,
): boolean {
  if (chat.type !== ChatType.PERSONAL) return false;
  const members = chat.members ?? [];
  return members.length === 1 && members[0].userId === userId && !members[0].leftAt;
}
