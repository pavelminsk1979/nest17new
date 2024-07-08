export type CreateUser = {
  login: string;
  passwordHash: string;
  email: string;
  createdAt: string;
  confirmationCode: string;
  isConfirmed: boolean;
  expirationDate: string;
};
