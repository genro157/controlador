export type LoanStatus = 'pendente' | 'pago' | 'atrasado';

export interface Loan {
  id: string;
  clientName: string;
  amountLoaned: number;
  amountToReceive: number;
  loanDate: string;
  dueDate: string;
  status: LoanStatus;
  paymentMethod?: string;
  notes?: string;
  uid: string;
  createdAt: string;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
