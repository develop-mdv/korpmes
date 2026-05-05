import { TaskStatus, TaskPriority } from '@corp/shared-types';
import type { Task as TaskBase } from '@corp/shared-types';
import { apiClient } from './client';

export { TaskStatus, TaskPriority };

export interface UserRef {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export interface Task extends Omit<TaskBase, 'watchers'> {
  createdByUser?: UserRef;
  assignedToUser?: UserRef | null;
  watchers?: UserRef[];
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  chatId?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: UserRef;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  organizationId: string;
  chatId?: string;
  assignedTo?: string;
  dueDate?: string;
  watcherIds?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignedTo?: string | null;
  dueDate?: string | null;
  watcherIds?: string[];
}

interface TaskListResponse {
  items: Task[];
  total: number;
}

export interface MyTasksResponse {
  assigned: Task[];
  created: Task[];
  watching: Task[];
}

export async function getTasks(orgId: string, filters?: TaskFilters): Promise<Task[]> {
  const { data } = await apiClient.get<TaskListResponse>('/tasks', {
    params: { orgId, ...filters },
  });
  return (data as unknown as TaskListResponse).items;
}

export async function getMyTasks(orgId: string): Promise<MyTasksResponse> {
  const { data } = await apiClient.get<MyTasksResponse>('/tasks/my', {
    params: { orgId },
  });
  return data;
}

export async function getTask(id: string): Promise<Task> {
  const { data } = await apiClient.get<Task>(`/tasks/${id}`);
  return data;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data } = await apiClient.post<Task>('/tasks', input);
  return data;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`/tasks/${id}`, input);
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete(`/tasks/${id}`);
}

export async function addComment(taskId: string, content: string): Promise<TaskComment> {
  const { data } = await apiClient.post<TaskComment>(`/tasks/${taskId}/comments`, { content });
  return data;
}

export async function getComments(taskId: string): Promise<TaskComment[]> {
  const { data } = await apiClient.get<TaskComment[]>(`/tasks/${taskId}/comments`);
  return data;
}

// ─── Checklists ──────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  taskId: string;
  title: string;
  isDone: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export async function getChecklist(taskId: string): Promise<ChecklistItem[]> {
  const { data } = await apiClient.get<ChecklistItem[]>(`/tasks/${taskId}/checklist`);
  return data;
}

export async function addChecklistItem(taskId: string, title: string): Promise<ChecklistItem> {
  const { data } = await apiClient.post<ChecklistItem>(`/tasks/${taskId}/checklist`, { title });
  return data;
}

export async function updateChecklistItem(
  itemId: string,
  patch: { title?: string; isDone?: boolean; position?: number },
): Promise<ChecklistItem> {
  const { data } = await apiClient.patch<ChecklistItem>(`/tasks/checklist/${itemId}`, patch);
  return data;
}

export async function removeChecklistItem(itemId: string): Promise<void> {
  await apiClient.delete(`/tasks/checklist/${itemId}`);
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export interface TaskAttachment {
  id: string;
  organizationId: string;
  uploaderId: string;
  taskId: string | null;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  thumbnailKey?: string | null;
  createdAt: string;
}

export async function getAttachments(taskId: string): Promise<TaskAttachment[]> {
  const { data } = await apiClient.get<TaskAttachment[]>(`/tasks/${taskId}/files`);
  return data;
}

export async function detachFile(taskId: string, fileId: string): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}/files/${fileId}`);
}
