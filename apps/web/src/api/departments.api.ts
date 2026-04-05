import { apiClient } from './client';

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  parentDepartmentId?: string;
  children?: Department[];
}

export interface CreateDepartmentDto {
  name: string;
  description?: string;
  parentDepartmentId?: string;
}

export function listDepartments(orgId: string): Promise<Department[]> {
  return apiClient.get(`/organizations/${orgId}/departments`).then((r) => r.data);
}

export function createDepartment(orgId: string, dto: CreateDepartmentDto): Promise<Department> {
  return apiClient.post(`/organizations/${orgId}/departments`, dto).then((r) => r.data);
}

export function updateDepartment(orgId: string, id: string, dto: Partial<CreateDepartmentDto>): Promise<Department> {
  return apiClient.patch(`/organizations/${orgId}/departments/${id}`, dto).then((r) => r.data);
}

export function deleteDepartment(orgId: string, id: string): Promise<void> {
  return apiClient.delete(`/organizations/${orgId}/departments/${id}`).then((r) => r.data);
}
