export interface Customer {
  id: string;
  name: string;
  username: string;
  email: string;
  emailVerified: boolean;
  points: number;
  formattedCreatedAt: string;
}

export type UserInfo = {
  id: string;
  name: string;
  username: string;
  email: string;
  emailVerified: boolean;
};
