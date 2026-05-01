import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IonName = ComponentProps<typeof Ionicons>['name'];

export const tabIcons: Record<
  'chats' | 'tasks' | 'calls' | 'files' | 'settings',
  { active: IonName; inactive: IonName }
> = {
  chats: { active: 'chatbubble', inactive: 'chatbubble-outline' },
  tasks: { active: 'checkbox', inactive: 'checkbox-outline' },
  calls: { active: 'call', inactive: 'call-outline' },
  files: { active: 'folder', inactive: 'folder-outline' },
  settings: { active: 'settings', inactive: 'settings-outline' },
};

export const headerIcons = {
  back: 'chevron-back-outline' as IonName,
  close: 'close-outline' as IonName,
  search: 'search-outline' as IonName,
  add: 'add-outline' as IonName,
  attach: 'attach-outline' as IonName,
  send: 'send' as IonName,
  mic: 'mic' as IonName,
  micOff: 'mic-off' as IonName,
  video: 'videocam' as IonName,
  videoOff: 'videocam-off' as IonName,
  phoneEnd: 'call' as IonName,
  more: 'ellipsis-horizontal' as IonName,
  warning: 'alert-circle-outline' as IonName,
  check: 'checkmark' as IonName,
  download: 'cloud-download-outline' as IonName,
  trash: 'trash-outline' as IonName,
};
