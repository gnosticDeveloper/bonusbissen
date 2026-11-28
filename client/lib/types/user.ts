export enum UserRole {
  ADMIN = "ADMIN",
  CASHIER = "CASHIER",
  USER = "USER",
}

/** Staff user from `GET /users/me/admin`. */
export type AdminUserInfo = {
  username: string;
  name: string;
  role: UserRole;
  email: string;
  emailVerified: boolean;
  /** Public URL of the profile picture; null when the user has none. */
  avatarUrl: string | null;
};

/** What the customer sign-in and sign-up actions return; the backend answers those with a token only. */
export type SignInUser = { name: string; avatarUrl: string | null };
