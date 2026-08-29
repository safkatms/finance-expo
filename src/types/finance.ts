// src/types/finance.ts

export type TxnType = 'Income' | 'Expense' | 'Transfer';
export type LoanDirection = 'Gave' | 'Received';
export type LoanStatus = 'Outstanding' | 'PartiallyPaid' | 'Settled' | 'WrittenOff';
export type AccountType = 'bank' | 'mobile_banking' | 'cash' | 'card' | 'investment' | 'other';
export type Role = 'admin' | 'user';

export interface User {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    role: Role;
    isActive: boolean;
    mustChangePassword: boolean;
    timezone: string;
    locale: string;
    currency: string;
    dateFormat: string;
    createdAt: string;
}

export interface Account {
    id: number;
    name: string;
    accountType: AccountType;
    institution: string | null;
    openingBalance: number;
    currency: string;
    color: string | null;
    icon: string | null;
    displayOrder: number;
    isDefault: boolean;
    includeInNetWorth: boolean;
    notes: string | null;
    currentBalance: number;
    totalIncome: number;
    totalExpense: number;
    createdAt: string;
}

export interface Category {
    id: number;
    parentId: number | null;
    name: string;
    slug: string;
    applicableType: TxnType | null;
    color: string | null;
    icon: string | null;
    isSystem: boolean;
    displayOrder: number;
    description: string | null;
    children?: Category[];
}

export interface PinnedCategory {
    id: number;
    categoryId: number;
    categoryName: string;
    icon: string | null;
    color: string | null;
    displayOrder: number;
    monthlyTotal: number;
}

export interface Transaction {
    id: number;
    txnDate: string;
    txnMonth: string;
    type: TxnType;
    categoryId: number | null;
    amount: string;
    currency: string;
    fromAccountId: number | null;
    toAccountId: number | null;
    description: string | null;
    note: string | null;
    referenceNumber: string | null;
    source: string;
    category?: Category;
    fromAccount?: Account;
    toAccount?: Account;
    createdAt: string;
}

export interface Loan {
    id: number;
    loanDate: string;
    direction: LoanDirection;
    personName: string;
    personPhone: string | null;
    amount: string;
    currency: string;
    accountId: number;
    status: LoanStatus;
    dueDate: string | null;
    purpose: string | null;
    notes: string | null;
    totalPaid: string;
    outstanding: string;
    account?: Account;
    payments?: LoanPayment[];
    createdAt: string;
}

export interface LoanPayment {
    id: number;
    loanId: number;
    paymentDate: string;
    amount: string;
    accountId: number;
    isFinal: boolean;
    note: string | null;
    account?: Account;
}

export interface MonthMetrics {
    income: number;
    expense: number;
    savings: number;
}

export interface AllTimeTotals {
    totalIncome: number;
    totalExpense: number;
    totalSavings: number;
}

export interface AccountBalance {
    id: number;
    name: string;
    accountType: AccountType;
    icon: string | null;
    color: string | null;
    isDefault: boolean;
    includeInNetWorth: boolean;
    openingBalance: number;
    totalIncome: number;
    totalExpense: number;
    currentBalance: number;
}

export interface LoanSummary {
    owedToMe: number;
    iOwe: number;
    net: number;
    activeGave: number;
    activeReceived: number;
    overdueCount: number;
}

export interface ActiveLoan {
    id: number;
    direction: LoanDirection;
    personName: string;
    amount: string;
    totalPaid: string;
    outstanding: string;
    status: LoanStatus;
    dueDate: string | null;
    loanDate: string;
    account: { id: number; name: string };
}

export interface RecentTransaction {
    id: number;
    txnDate: string;
    txnMonth: string;
    type: TxnType;
    amount: string;
    description: string | null;
    note: string | null;
    category: { id: number; name: string; icon: string | null; color: string | null } | null;
    fromAccount: { id: number; name: string } | null;
    toAccount: { id: number; name: string } | null;
}

export interface CategoryBreakdownItem {
    categoryId: number | null;
    categoryName: string;
    icon: string;
    color: string;
    total: number;
}

export interface MonthlyBreakdownRow {
    month: string;
    income: number;
    expense: number;
    savings: number;
}

export interface DashboardData {
    month: string;
    monthMetrics: MonthMetrics;
    allTimeTotals: AllTimeTotals;
    accounts: AccountBalance[];
    netWorth: number;
    loanSummary: LoanSummary;
    activeLoans: ActiveLoan[];
    recentTransactions: RecentTransaction[];
    categoryBreakdown: CategoryBreakdownItem[];
    monthlyBreakdown: MonthlyBreakdownRow[];
    pinnedCategories: PinnedCategory[];
}

export interface PaginationMeta {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
}

export interface PaginatedData<T> {
    data: T[];
    meta: PaginationMeta;
    summary?: {
        income: number;
        expense: number;
        savings: number;
    };
}

// Add to finance.ts
export interface AccountStatementRow {
    id: number;
    entryDate: string;
    period: string;
    transactionId: number;
    type: TxnType;
    description: string | null;
    referenceNumber: string | null;
    category: { id: number; name: string; icon: string | null } | null;
    credit: number;
    debit: number;
    balance: number;
}

export interface AccountStatement {
    account: {
        id: number;
        name: string;
        accountType: AccountType;
        color: string | null;
        openingBalance: number;
    };
    openingBalance: number;
    fromDate: string | null;
    toDate: string | null;
    totalCredit: number;
    totalDebit: number;
    closingBalance: number;
    rows: AccountStatementRow[];
}