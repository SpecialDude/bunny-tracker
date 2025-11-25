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

export enum CrossingStatus {
  Pending = 'Pending',          // Just mated
  Pregnant = 'Pregnant',        // Palpation Confirmed
  Failed = 'Failed',            // Palpation Negative
  Delivered = 'Delivered'       // Kits born
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
  defaultPalpationDays: number;
  createdAt: any; 
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
  dateOfBirth: string; // ISO String
  dateOfAcquisition?: string;
  source: 'Born' | 'Purchased';
  purchaseCost?: number;
  status: RabbitStatus;
  currentHutchId: string | null;
  pictureUrl?: string;
  parentage: {
    sireId?: string; // Tag 
    doeId?: string;  // Tag 
  };
  notes: string;
  farmId: string;
}

export interface Crossing {
  id?: string;
  doeId: string;    // Tag
  sireId: string;   // Tag
  doeName?: string; // Cache for display
  sireName?: string;// Cache for display
  dateOfCrossing: string;
  expectedPalpationDate: string;
  palpationResult?: 'Positive' | 'Negative' | 'Pending';
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  status: CrossingStatus;
  notes?: string;
  farmId: string;
}

export interface Delivery {
  id?: string;
  crossingId: string;
  doeId: string;
  sireId: string;
  dateOfDelivery: string;
  kitsBorn: number;
  kitsLive: number;
  kitIds?: string[]; // IDs of created rabbit records
  notes?: string;
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

export interface Sale {
  id?: string;
  saleId: string;
  rabbitIds: string[]; // List of tags/IDs sold
  buyerName: string;
  amount: number;
  date: string;
  notes?: string;
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