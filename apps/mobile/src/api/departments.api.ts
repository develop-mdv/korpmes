import { apiClient } from './client';

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  parentDepartmentId?: string;
  children?: Department[];
}

export interface CreateDepartmentInput {
  name: string;
  description?: string;
  parentDepartmentId?: string;
}

export async function listDepartments(orgId: string): Promise<Department[]> {
  const { data } = await apiClient.get<Department[]>(`/organizations/${orgId}/departments`);
  return data;
}

export async function createDepartment(orgId: string, input: CreateDepartmentInput): Promise<Department> {
  const { data } = await apiClient.post<Department>(`/organizations/${orgId}/departments`, input);
  return data;
}

export async function updateDepartment(
  orgId: string,
  id: string,
  input: Partial<CreateDepartmentInput>,
): Promise<Department> {
  const { data } = await apiClient.patch<Department>(`/organizations/${orgId}/departments/${id}`, input);
  return data;
}

export async function deleteDepartment(orgId: string, id: string): Promise<void> {
  await apiClient.delete(`/organizations/${orgId}/departments/${id}`);
}
