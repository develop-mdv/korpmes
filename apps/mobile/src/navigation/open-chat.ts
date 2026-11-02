import { getChatById } from '../api/chats.api';
import { getOrganizations } from '../api/organizations.api';
import { useOrganizationStore } from '../stores/organization.store';
import { useChatStore } from '../stores/chat.store';

export async function openChatInWorkspace(chatId: string): Promise<void> {
  const chat = await getChatById(chatId);
  const store = useOrganizationStore.getState();
  let orgs = store.organizations;
  if (chat.organizationId && !orgs.some((org) => org.id === chat.organizationId)) {
    orgs = await getOrganizations();
    store.setOrganizations(orgs);
  }
  const organization = orgs.find((org) => org.id === chat.organizationId) ?? null;
  if (chat.organizationId && !organization) throw new Error('Нет доступа к организации');
  store.setCurrentOrg(organization);
  useChatStore.getState().addChat(chat);
  store.setPendingChatId(chatId);
}
