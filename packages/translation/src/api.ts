import type { Credentials } from "./types";

// Litium admin API client: OAuth client credentials, retry on 401/429/5xx (same as link-channel.ts).
export class LitiumApi {
    private token: { value: string; expiresAt: number } | null = null;
    readonly baseUrl: string;

    constructor(private creds: Credentials) {
        this.baseUrl = creds.url.replace(/\/+$/, "");
    }

    async getToken(): Promise<string> {
        if (this.token && Date.now() < this.token.expiresAt - 60_000) return this.token.value;
        const res = await fetch(`${this.baseUrl}/Litium/OAuth/Token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ grant_type: "client_credentials", client_id: this.creds.clientId, client_secret: this.creds.clientSecret }),
        });
        if (!res.ok) throw new Error(`token request failed: ${res.status} ${await res.text()}`);
        const body = (await res.json()) as { access_token: string; expires_in?: number };
        this.token = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
        return this.token.value;
    }

    async request<T>(method: string, path: string, body?: unknown, contentType = "application/json"): Promise<T> {
        for (let attempt = 1; ; attempt++) {
            const res = await fetch(`${this.baseUrl}${path}`, {
                method,
                headers: {
                    Authorization: `Bearer ${await this.getToken()}`,
                    Accept: "application/json",
                    ...(body !== undefined && { "Content-Type": contentType }),
                },
                body: body !== undefined ? JSON.stringify(body) : undefined,
            });
            if (res.status === 401 && attempt === 1) { this.token = null; continue; }
            if ((res.status === 429 || res.status >= 500) && attempt < 4) { await sleep(1000 * 2 ** attempt); continue; }
            if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
            const text = await res.text();
            return (text ? JSON.parse(text) : undefined) as T;
        }
    }

    get<T>(path: string) { return this.request<T>("GET", path); }

    // Paged POST search, yields batches.
    async *search<T>(path: string, pageSize = 200): AsyncGenerator<T[]> {
        for (let skip = 0; ; skip += pageSize) {
            const res = await this.request<{ total: number; items: T[] | null }>("POST", path, { skip, take: pageSize });
            const items = res?.items ?? [];
            yield items;
            if (items.length === 0 || skip + items.length >= res.total) return;
        }
    }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
