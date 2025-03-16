import { User } from "@prisma/client";
import { DefaultSession } from "next-auth";

// Extend next-auth session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      group: "ADMIN" | "USER";
    } & DefaultSession["user"];
  }
}

// Redux State Types
export interface DatesState {
  startDate: Date;
  endDate: Date;
  datesSet: boolean;
  selectedUserId: string | null;
}

export interface CartItem {
  id: string;
  name: string;
  amount: number;
}

export interface CartState {
  items: CartItem[];
  description: string;
}

// Component Props Types
export interface ItemCardProps {
  item: {
    id: string;
    name: string;
    description?: string;
    amount: number;
    image?: string;
    categories: {
      id: string;
      name: string;
    }[];
  };
  availableAmount: number;
}

export interface LoanCardProps {
  loan: {
    id: string;
    startTime: Date;
    endTime: Date;
    status: "PENDING" | "APPROVED" | "REJECTED" | "INUSE" | "RETURNED";
    description?: string;
    user: User;
    reservations: {
      id: string;
      amount: number;
      item: {
        id: string;
        name: string;
      };
    }[];
  };
}

// API Types
export interface SubmitLoanRequest {
  reservations: {
    item: {
      connect: {
        id: string;
      };
    };
    amount: number;
  }[];
  startTime: Date;
  endTime: Date;
  userId: string;
  description?: string;
}
