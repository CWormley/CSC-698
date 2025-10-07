// Common shared types and utilities
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const formatDate = (date: Date): string => {
  const datePart = date.toISOString().split('T')[0];
  return datePart!;
};
