import api from "@/utils/axios";

export interface RoleDto {
  id: string;
  name: string;
  description: string | null;
}

const roleService = {
  getRoles: () =>
    api.get<{ data: RoleDto[] }>("/api/roles"),
};

export default roleService;
