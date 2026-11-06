import fs from "node:fs";
import path from "node:path";
import { Arguments } from "@papit/arguments";
import { Terminal } from "@papit/terminal";
import { LitiumApi } from "../api";
import { getCredentials } from "../credentials";
import { ENDPOINTS } from "../litium";

// Debug: saves the raw server responses pull is built on.
export async function inspect() {
    const api = new LitiumApi(await getCredentials());
    const out = path.resolve(Arguments.string("out") ?? "inspect");
    fs.mkdirSync(out, { recursive: true });
    const { close, update } = Terminal.loading("fetching");
    try {
        for (const [name, p] of Object.entries(ENDPOINTS)) {
            update(`GET ${p}`);
            fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(await api.get(p), null, 2));
        }
        close();
        Terminal.success("saved raw responses to", out);
    } catch (e) {
        close();
        Terminal.error(String(e));
        process.exit(1);
    }
}
