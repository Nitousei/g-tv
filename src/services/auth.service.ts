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
    }
}
