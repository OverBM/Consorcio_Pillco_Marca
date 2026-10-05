export interface ApiResponse<T = any> {
    codigo?: string;
    mensaje?: string;
    usuario?: any;
    token?: string;
    data?: T;
    errores?: Record<string, string[]>;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api/v1';

export class HttpClient {
    private static getToken(): string | null {
        return localStorage.getItem('cpm_auth_token');
    }

    public static setToken(token: string): void {
        localStorage.setItem('cpm_auth_token', token);
    }

    public static removeToken(): void {
        localStorage.removeItem('cpm_auth_token');
    }

    public static async request<T = any>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const token = this.getToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            if (response.status === 401) {
                this.removeToken();
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.mensaje || `Error HTTP ${response.status}`);
            }

            return data;
        } catch (error: any) {
            return {
                codigo: 'ERROR_RED',
                mensaje: error.message || 'Error de conexión con el servidor',
            };
        }
    }

    public static get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    public static post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        });
    }
}
