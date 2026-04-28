import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ChatStack } from './ChatStack';
import { TasksScreen } from '../screens/tasks/TasksScreen';
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen';
import { CallsScreen } from '../screens/calls/CallsScreen';
import { FilesScreen } from '../screens/files/FilesScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { useChatStore } from '../stores/chat.store';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme, tabIcons } from '../theme';
import type { AppTabParamList, TaskStackParamList } from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();
const TaskStack = createNativeStackNavigator<TaskStackParamList>();

function CreateTaskPlaceholder() {
  return null;
}

function TaskStackNavigator() {
  const theme = useTheme();
  return (
    <TaskStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <TaskStack.Screen name="TasksList" component={TasksScreen} options={{ title: 'Задачи' }} />
      <TaskStack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Карточка' }} />
      <TaskStack.Screen name="CreateTask" component={CreateTaskPlaceholder} options={{ title: 'Новая задача' }} />
    </TaskStack.Navigator>
  );
}

export function AppTabs() {
  const unreadCount = useChatStore((state) => state.totalUnread);
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.bg,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="ChatsTab"
        component={ChatStack}
        options={{
          title: 'Чаты',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? tabIcons.chats.active : tabIcons.chats.inactive} color={color} size={size} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.error, color: theme.colors.onPrimary },
        }}
      />
      <Tab.Screen
        name="TasksTab"
        component={TaskStackNavigator}
        options={{
          title: 'Задачи',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? tabIcons.tasks.active : tabIcons.tasks.inactive} color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="CallsTab"
        component={CallsScreen}
        options={{
          title: 'Звонки',
          headerShown: true,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? tabIcons.calls.active : tabIcons.calls.inactive} color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="FilesTab"
        component={FilesScreen}
        options={{
          title: 'Файлы',
          headerShown: true,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? tabIcons.files.active : tabIcons.files.inactive} color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Настройки',
          headerShown: true,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? tabIcons.settings.active : tabIcons.settings.inactive} color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
