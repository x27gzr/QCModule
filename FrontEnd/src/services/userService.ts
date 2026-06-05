import api from "@/utils/axios";

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UserSummaryDto {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface GetUsersParams {
  search?: string;
  roleId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  roleId: string;
}

export interface UpdateUserPayload {
  name: string;
  email: string;
  roleId: string;
}

const userService = {
  getUsers: (params?: GetUsersParams) =>
    api.get<{ data: PaginatedResult<UserSummaryDto> }>("/api/users", { params }),

  getUserById: (id: string) =>
    api.get<{ data: UserDto }>(`/api/users/${id}`),

  createUser: (payload: CreateUserPayload) =>
    api.post<{ data: UserDto }>("/api/users", payload),

  updateUser: (id: string, payload: UpdateUserPayload) =>
    api.put<{ data: UserDto }>(`/api/users/${id}`, { id, ...payload }),

  deleteUser: (id: string) =>
    api.delete(`/api/users/${id}`),

  toggleActive: (id: string) =>
    api.patch<{ data: boolean; message: string }>(`/api/users/${id}/active`),

  changePassword: (id: string, payload: { currentPassword?: string; newPassword: string; confirmPassword: string }) =>
    api.put(`/api/users/${id}/password`, payload),
};

export default userService;
