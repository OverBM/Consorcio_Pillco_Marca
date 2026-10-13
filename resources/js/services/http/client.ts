export interface ApiEnvelope<T = unknown> {
    data: T;
    meta?: Record<string, unknown>;
    message?: string;
}

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
    public readonly status: number;

    public readonly code?: string;

    public readonly errors: FieldErrors;

    constructor(message: string, status = 0, errors: FieldErrors = {}, code?: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
        this.code = code;
    }

    public hasFieldErrors(): boolean {
        return Object.keys(this.errors).length > 0;
    }
}

const API_BASE = (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL || '/api/v1';

function csrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http')) {
        return endpoint;
    }
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE}${path}`;
}

function normalizeEnvelope<T>(payload: unknown): ApiEnvelope<T> {
    if (payload && typeof payload === 'object') {
        const record = payload as Record<string, unknown>;

        if ('data' in record) {
            return {
                data: record.data as T,
                meta: (record.meta as Record<string, unknown>) ?? undefined,
                message: (record.message as string) ?? (record.mensaje as string) ?? undefined,
            };
        }
    }

    return { data: payload as T };
}

function parseError(status: number, payload: unknown): ApiError {
    if (payload && typeof payload === 'object') {
        const record = payload as Record<string, unknown>;
        const message =
            (record.message as string) ||
            (record.mensaje as string) ||
            `Error HTTP ${status}`;
        const errors = (record.errors as FieldErrors) ?? {};
        const code = (record.codigo as string) ?? undefined;

        return new ApiError(message, status, errors, code);
    }

    return new ApiError(`Error HTTP ${status}`, status);
}

export class HttpClient {
    public static async request<T = unknown>(
        endpoint: string,
        options: RequestInit = {},
    ): Promise<ApiEnvelope<T>> {
        const headers: Record<string, string> = {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': csrfToken(),
            ...(options.headers as Record<string, string> | undefined),
        };

        if (options.body !== undefined && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        let response: Response;

        try {
            response = await fetch(buildUrl(endpoint), {
                ...options,
                credentials: 'same-origin',
                headers,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error de conexión con el servidor';
            throw new ApiError(message, 0);
        }

        let payload: unknown = null;
        const text = await response.text();
        if (text) {
            try {
                payload = JSON.parse(text);
            } catch {
                payload = null;
            }
        }

        if (!response.ok) {
            throw parseError(response.status, payload);
        }

        return normalizeEnvelope<T>(payload);
    }

    public static get<T = unknown>(endpoint: string): Promise<ApiEnvelope<T>> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    public static post<T = unknown>(endpoint: string, body?: unknown): Promise<ApiEnvelope<T>> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    }

    public static put<T = unknown>(endpoint: string, body?: unknown): Promise<ApiEnvelope<T>> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    }

    public static patch<T = unknown>(endpoint: string, body?: unknown): Promise<ApiEnvelope<T>> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    }

    public static delete<T = unknown>(endpoint: string): Promise<ApiEnvelope<T>> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}
