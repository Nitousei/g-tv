
export interface RequestOptions extends RequestInit {
    data?: any;
}

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { data, headers, ...customConfig } = options;

    const config: RequestInit = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        ...customConfig,
    };

    if (config.method?.toUpperCase() !== 'GET' && data) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, config);
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'Request failed');
        }

        return responseData;
    } catch (error: any) {
        throw error;
    }
}
