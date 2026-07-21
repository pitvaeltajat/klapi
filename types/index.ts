import { Announcement } from '@prisma/client';
import { DefaultSession } from 'next-auth';

// Extend next-auth session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      group: 'ADMIN' | 'USER' | 'KIOSK';
      adminExpiry?: string | null;
      // When a kiosk session is PIN-elevated, the id/name of the admin who
      // elevated it — used to attribute loan-history events to the real admin
      // and to show their initials in the top bar.
      elevatedById?: string | null;
      elevatedByName?: string | null;
    } & DefaultSession['user'];
  }
  interface User {
    group: 'ADMIN' | 'USER' | 'KIOSK';
    adminExpiry?: string | null;
  }
}

// Context state types (cart + dates providers in `contexts/`)
export interface DatesState {
  startDate: Date;
  endDate: Date;
  datesSet: boolean;
  selectedUserId: string | null;
  browseMode: boolean;
}

export interface CartItem {
  id: string;
  name: string;
  amount: number;
}

export interface CartState {
  items: CartItem[];
  description: string;
  loaner?: string;
  userId?: string;
}

// Component Props Types
export interface ItemCardProps {
  item: {
    id: string;
    name: string;
    description?: string;
    amount: number;
    categories: {
      id: string;
      name: string;
    }[];
    announcements: Announcement[];
  };
  availableAmount: number;
  availabilityLoading?: boolean;
  availabilityKnown?: boolean;
}

