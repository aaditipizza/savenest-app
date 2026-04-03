
export enum Category {
  COFFEE = 'Coffee ☕',
  FOOD = 'Food 🍔',
  SHOPPING = 'Shopping 🛍️',
  TRANSPORT = 'Transport 🚗',
  OTHER = 'Other ✨'
}

export interface Transaction {
  id: string;
  amount: number;
  category: Category;
  note: string;
  date: string;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  icon: string;
}

export interface UserState {
  name: string;
  totalSavings: number;
  streak: number;
  goals: Goal[];
  history: Transaction[];
  theme: 'sleek' | 'minimal' | 'royal' | 'classic';
  profilePic?: string;
  currency: string;
  notificationsEnabled: boolean;
}
