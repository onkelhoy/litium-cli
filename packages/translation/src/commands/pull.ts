import path from "node:path";
import { Arguments } from "@papit/arguments";
import { Terminal } from "@papit/terminal";
import { LitiumApi } from "../api";
import { getCredentials } from "../credentials";
import { fetchSnapshot } from "../litium";
import { toRows } from "../rows";
import { writeExcel } from "../excel";

const KINDS = ["translations", "blocks", "pages"] as const;

export async function pull() {
    const api = new LitiumApi(await getCredentials());

    const include = new Set((Arguments.string("include") ?? KINDS.join(",")).split(",").map(s => s.trim())) as Set<any>;
    for (const k of include) if (!KINDS.includes(k)) { Terminal.error(`unknown --include "${k}"`); process.exit(1); }

    let out = Arguments.string("out");
    if (!out) {
        Terminal.createSession();
        const host = new URL(api.baseUrl).hostname.split(".")[0];
        const ans = await Terminal.prompt(`excel file (empty = ${host}.xlsx)`, true);
        Terminal.clearSession();
        out = String(ans.input).trim() || `${host}.xlsx`;
    }
    if (!out.endsWith(".xlsx")) out += ".xlsx";
    out = path.resolve(out);

    const { close, update } = Terminal.loading("fetching");
    try {
        const snapshot = await fetchSnapshot(api, t => update(`fetching ${t}`));
        update("writing excel");
        const rows = toRows(snapshot, { include, systemFields: Arguments.has("system-fields") });
        await writeExcel(out, snapshot.languages, rows);
        close();
        Terminal.success(`${rows.length} rows, ${snapshot.languages.length} languages ->`, out);
    } catch (e) {
        close();
        Terminal.error(String(e));
        process.exit(1);
    }
}
