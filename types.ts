// Enums
export enum RabbitStatus {
  Alive = 'Alive',
  Weaned = 'Weaned',
  Pregnant = 'Pregnant',
  Sold = 'Sold',
  Dead = 'Dead',
  Slaughtered = 'Slaughtered'
}

export enum Sex {
  Male = 'Male',
  Female = 'Female'
}

export enum TransactionType {
  Income = 'Income',
  Expense = 'Expense'
}

// Data Models
export interface Farm {
  farmId: string;
  name: string;
  ownerUid: string;
  timezone: string;
  currency: string;
  defaultGestationDays: number;
  defaultWeaningDays: number;
  createdAt: any; // Firestore Timestamp
}

export interface Hutch {
  id?: string;
  hutchId: string;
  label: string;
  number: number;
  capacity: number;
  currentOccupancy: number;
  accessories: string[];
  farmId: string;
}

export interface Rabbit {
  id?: string;
  rabbitId: string; // Internal ID
  tag: string; // Human readable
  name?: string;
  breed: string;
  sex: Sex;
  dateOfBirth: string; // ISO String for frontend
  dateOfAcquisition?: string;
  source: 'Born' | 'Purchased';
  purchaseCost?: number;
  status: RabbitStatus;
  currentHutchId: string | null;
  pictureUrl?: string;
  parentage: {
    sireId?: string; // Tag or ID
    doeId?: string;  // Tag or ID
  };
  notes: string;
  farmId: string;
}

export interface Crossing {
  id?: string;
  doeId: string;
  sireId: string;
  dateOfCrossing: string;
  expectedDeliveryDate: string;
  status: 'Pending' | 'Confirmed' | 'Delivered' | 'Failed';
  farmId: string;
}

export interface Transaction {
  id?: string;
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  relatedId?: string; // ID of sold rabbit or medication
  notes: string;
  farmId: string;
}

// AI Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
  groundingUrls?: string[];
}