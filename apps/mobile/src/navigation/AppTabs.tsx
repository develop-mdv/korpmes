import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import { ChatStack } from './ChatStack';
import { TasksScreen } from '../screens/tasks/TasksScreen';
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen';
import { CallsScreen } from '../screens/calls/CallsScreen';
import { FilesScreen } from '../screens/files/FilesScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { Badge } from '../components/Badge';
import { useChatStore } from '../stores/chat.store';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppTabParamList, TaskStackParamList } from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();
const TaskStack = createNativeStackNavigator<TaskStackParamList>();

function TaskStackNavigator() {
  return (
    <TaskStack.Navigator>
      <TaskStack.Screen
        name="TasksList"
        component={TasksScreen}
        options={{ title: 'Tasks' }}
      />
      <TaskStack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ title: 'Task Detail' }}
      />
      <TaskStack.Screen
        name="CreateTask"
        component={CreateTaskPlaceholder}
        options={{ title: 'Create Task' }}
      />
    </TaskStack.Navigator>
  );
}

function CreateTaskPlaceholder() {
  return null;
}

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Chats: '💬',
    Tasks: '📋',
    Calls: '📞',
    Files: '📂',
    Settings: '⚙️',
  };
  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {icons[label] || '●'}
    </Text>
  );
}

export function AppTabs() {
  const unreadCount = useChatStore((state) => state.totalUnread);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="ChatsTab"
        component={ChatStack}
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused }) => <TabIcon label="Chats" focused={focused} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tab.Screen
        name="TasksTab"
        component={TaskStackNavigator}
        options={{
          title: 'Tasks',
          tabBarIcon: ({ focused }) => <TabIcon label="Tasks" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="CallsTab"
        component={CallsScreen}
        options={{
          title: 'Calls',
          headerShown: true,
          tabBarIcon: ({ focused }) => <TabIcon label="Calls" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="FilesTab"
        component={FilesScreen}
        options={{
          title: 'Files',
          headerShown: true,
          tabBarIcon: ({ focused }) => <TabIcon label="Files" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerShown: true,
          tabBarIcon: ({ focused }) => <TabIcon label="Settings" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  tabIconFocused: {
    opacity: 1,
  },
});
