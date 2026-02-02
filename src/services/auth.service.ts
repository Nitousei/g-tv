import { request } from "@/lib/http";

export interface LoginParams {
    username: string;
    password: string;
}

export const authService = {
    login: (data: LoginParams) => {
        return request<any>('/api/auth/login', {
            method: 'POST',
            data
        });
    },
    register: (data: any) => {
        return request<any>('/api/auth/register', {
            method: 'POST',
            data
        });
    }
}
