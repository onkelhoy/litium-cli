import fs from "node:fs";
import path from "node:path";
import { Arguments } from "@papit/arguments";
import { Terminal } from "@papit/terminal";
import { readExcel } from "../excel";
import { Project, resolveLitium } from "../project";
import { applyRows, type Change } from "../sync";

export async function push() {
    // excel
    let input = Arguments.string("in");
    if (!input) {
        Terminal.createSession();
        input = String((await Terminal.prompt("excel file", true)).path);
        Terminal.clearSession();
    }
    input = path.resolve(input);
    if (!fs.existsSync(input)) { Terminal.error("file not found:", input); process.exit(1); }

    // project
    let litium: string | null = null;
    const projectArg = Arguments.string("project");
    if (projectArg) litium = resolveLitium(path.resolve(projectArg));
    else if (resolveLitium(process.cwd()) && await confirmCwd()) litium = resolveLitium(process.cwd());
    while (!litium) {
        if (projectArg) { Terminal.error("no litium folder in", projectArg); process.exit(1); }
        Terminal.createSession();
        const ans = await Terminal.prompt("project folder (with litium/)", true);
        Terminal.clearSession();
        litium = resolveLitium(String(ans.path));
        if (!litium) Terminal.warn("no litium folder in", String(ans.path));
    }

    // dry
    let dry = Arguments.has("dry");
    if (!dry && !Arguments.has("apply")) {
        Terminal.createSession();
        dry = !(await Terminal.confirm("write changes to yaml? (no = dry run)", false));
        Terminal.clearSession();
    }

    const { close, update } = Terminal.loading("reading excel");
    const { languages, rows } = await readExcel(input);
    update("reading project yaml");
    const project = new Project(litium);
    close();

    const changes = applyRows(project, rows, languages, { prune: Arguments.has("prune") });
    report(changes, litium);

    if (dry) { Terminal.info("dry run, nothing written. add --apply to write"); return; }
    const written = project.save();
    Terminal.success(`wrote ${written.length} files`);
    if (Arguments.verbose) written.forEach(f => Terminal.write("  " + path.relative(litium!, f)));
}

async function confirmCwd() {
    Terminal.createSession();
    const ok = await Terminal.confirm(`use ${process.cwd()}?`, true);
    Terminal.clearSession();
    return ok;
}

function report(changes: Change[], root: string) {
    const by = (k: Change["kind"]) => changes.filter(c => c.kind === k);
    const rel = (f: string) => path.relative(root, f);
    const detail = Arguments.verbose || Arguments.has("dry");

    const updates = changes.filter(c => c.kind === "text-updated" || c.kind === "name-updated") as Extract<Change, { from: string }>[];
    if (detail) for (const c of updates) Terminal.write(Terminal.yellow("~"), c.key, Terminal.dim(c.lang), Terminal.red(JSON.stringify(c.from)), "->", Terminal.green(JSON.stringify(c.to)), Terminal.dim(rel(c.file)));
    if (detail) for (const c of by("text-added")) Terminal.write(Terminal.green("+"), (c as any).key, Terminal.dim(rel((c as any).file)));
    for (const c of by("option-added")) Terminal.write(Terminal.green("+ option"), (c as any).key, Terminal.bold((c as any).value));
    for (const c of by("option-removed")) Terminal.write(Terminal.red("- option"), (c as any).key, Terminal.bold((c as any).value));
    for (const c of by("option-missing-on-server")) Terminal.warn("option only in code:", (c as any).key, Terminal.bold((c as any).value), Terminal.dim("(--prune removes)"));
    if (detail) for (const c of by("not-in-project")) Terminal.write(Terminal.dim("? not in project " + c.key));

    Terminal.write();
    Terminal.write(
        `${updates.length} values updated, ${by("text-added").length} new texts, ` +
        `${by("option-added").length} options added, ${by("option-removed").length} removed, ` +
        `${by("option-missing-on-server").length} only in code, ${by("not-in-project").length} not in project`,
    );
}
