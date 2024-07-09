export type SecurityDevice = {
  deviceId: string;
  issuedAtRefreshToken: string;
  userId: string;
  ip: string;
  nameDevice: string;
};

export type SecurityDeviceWithId = {
  id: string;
  deviceId: string;
  issuedAtRefreshToken: string;
  userId: string;
  ip: string;
  nameDevice: string;
};
