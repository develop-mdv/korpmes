import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppTabParamList>;
  ActiveCall: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type AppTabParamList = {
  ChatsTab: NavigatorScreenParams<ChatStackParamList>;
  TasksTab: NavigatorScreenParams<TaskStackParamList>;
  CallsTab: undefined;
  FilesTab: undefined;
  SettingsTab: undefined;
};

export type ChatStackParamList = {
  ChatsList: undefined;
  ChatView: { chatId: string };
  NewChat: undefined;
  ChatSettings: { chatId: string };
  Thread: { chatId: string; parentMessageId: string; parentContent: string };
};

export type TaskStackParamList = {
  TasksList: undefined;
  TaskDetail: { taskId: string };
  CreateTask: undefined;
};
