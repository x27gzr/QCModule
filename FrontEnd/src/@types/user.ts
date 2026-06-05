export type UserRole = "Admin" | "Supervisor" | "Analyst";

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}
