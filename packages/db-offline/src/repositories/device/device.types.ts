import type { NewDevice } from "../../schema";

export type CreateDeviceInput = NewDevice;
export type UpdateDeviceInput = Partial<
  Omit<NewDevice, "id" | "userId" | "createdAt">
>;
