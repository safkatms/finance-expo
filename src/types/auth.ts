export interface User {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    role: 'admin' | 'user';
    isActive: boolean;
    timezone: string;
    locale: string;
    currency: string;
    dateFormat: string;
    mustChangePassword: boolean;
    createdAt: string;
}

export interface LoginPayload {
    email: string;
    password: string;
}

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
}

export interface ChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
}

export interface ForgotPasswordPayload {
    email: string;
}

export interface ResetPasswordPayload {
    token: string;
    newPassword: string;
}