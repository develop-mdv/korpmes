import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard } from './auth-guard';
import { OrgGuard } from './org-guard';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { CreateOrganizationPage } from '@/pages/organization/CreateOrganizationPage';
import { JoinOrganizationPage } from '@/pages/organization/JoinOrganizationPage';
import { ChatsPage } from '@/pages/chats/ChatsPage';
import { CallsPage } from '@/pages/calls/CallsPage';
import { TasksPage } from '@/pages/tasks/TasksPage';
import { FilesPage } from '@/pages/files/FilesPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { OrganizationPage } from '@/pages/organization/OrganizationPage';
import { MembersPage } from '@/pages/organization/MembersPage';
import { DepartmentsPage } from '@/pages/organization/DepartmentsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { SearchPage } from '@/pages/search/SearchPage';
import { AuditPage } from '@/pages/audit/AuditPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/chats" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        path: '/create-organization',
        element: <CreateOrganizationPage />,
      },
      {
        path: '/join-organization',
        element: <JoinOrganizationPage />,
      },
      {
        element: <OrgGuard />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/chats', element: <ChatsPage /> },
              { path: '/chats/:chatId', element: <ChatsPage /> },
              { path: '/calls', element: <CallsPage /> },
              { path: '/tasks', element: <TasksPage /> },
              { path: '/files', element: <FilesPage /> },
              { path: '/notifications', element: <NotificationsPage /> },
              { path: '/organization', element: <OrganizationPage /> },
              { path: '/organization/members', element: <MembersPage /> },
              { path: '/organization/departments', element: <DepartmentsPage /> },
              { path: '/settings', element: <SettingsPage /> },
              { path: '/search', element: <SearchPage /> },
              { path: '/audit', element: <AuditPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
