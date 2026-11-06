import { Arguments } from "@papit/arguments";
import { Terminal } from "@papit/terminal";
import type { Credentials } from "./types";

// Flags first, prompt for whatever is missing. No .env.
export async function getCredentials(): Promise<Credentials> {
    const ask = async (flag: string, label: string) => {
        const v = Arguments.string(flag);
        if (v) return v;
        Terminal.createSession();
        const ans = await Terminal.prompt(label, true);
        Terminal.clearSession();
        return String(ans.input).trim();
    };
    const url = await ask("url", "backend url (ex: https://xyz-staging-platform.litium.app)");
    const clientId = await ask("client-id", "client id");
    const clientSecret = await ask("client-secret", "client secret");
    if (!url || !clientId || !clientSecret) {
        Terminal.error("url, client id and client secret are required");
        process.exit(1);
    }
    return { url, clientId, clientSecret };
}
