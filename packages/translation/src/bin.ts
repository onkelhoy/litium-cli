import fs from "node:fs";
import path from "node:path";
import { Arguments } from "@papit/arguments";
import { Terminal, type option } from "@papit/terminal";
import { inspect } from "./commands/inspect";
import { pull } from "./commands/pull";
import { push } from "./commands/push";

(async function () {
    Arguments.init(process.argv, ["dry", "apply", "prune", "system-fields", "inspect", "pull", "push"]);

    const pkgLocation = path.dirname(import.meta.dirname);
    const help = () => {
        const readme = fs.readFileSync(path.join(pkgLocation, "README.md"), "utf-8");
        console.log((readme.match(/^# CLI flags\n[\s\S]*?(?=^# )/m)?.[0] ?? readme).trim());
        process.exit(0);
    };
    if (process.argv.includes("--help") || process.argv.includes("-h") || process.argv.slice(2).includes("help")) help();

    const commands = ["pull", "push", "inspect"];
    let cmd: option | null = null;
    for (let i = 0; i < commands.length; i++) {
        if (Arguments.has(commands[i]) || process.argv.slice(2).includes(commands[i])) { cmd = { index: i, text: commands[i] }; break; }
    }
    if (!cmd) {
        Terminal.createSession();
        Terminal.write("what do you want to do?");
        cmd = await Terminal.option(["pull   server -> excel", "push   excel -> yaml", "inspect   save raw server data (debug)", "help   show flags"]);
        if (cmd.index === commands.length) help();
        cmd.text = commands[cmd.index];
        Terminal.clearSession();
    }

    switch (cmd.text) {
        case "inspect": await inspect(); break;
        case "pull": await pull(); break;
        case "push": await push(); break;
        default: Terminal.warn(`"${cmd.text}" not implemented yet`);
    }
    process.exit();
}());
