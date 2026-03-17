export interface SpendingRecord {
  id: string;
  amount: number;
  reason: string;
  date: string;
}

export interface Budget {
  id: string;
  secretaryName: string;
  allocatedAmount: number;
  spendingRecords: SpendingRecord[];
  description?: string;
  lastUpdated?: string;
}

export interface UserProfile {
  email: string;
  role: 'admin' | 'viewer';
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}
