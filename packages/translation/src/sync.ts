import { isMap, isSeq, YAMLMap, YAMLSeq } from "yaml";
import type { Localized, Row } from "./types";
import type { Project, YamlFile } from "./project";

export type Change =
    | { kind: "text-updated" | "name-updated"; key: string; file: string; lang: string; from: string; to: string }
    | { kind: "text-added"; key: string; file: string }
    | { kind: "option-added" | "option-removed"; key: string; value: string; file: string }
    | { kind: "option-missing-on-server"; key: string; value: string; file: string }
    | { kind: "not-in-project"; key: string };

export type SyncOptions = { prune?: boolean };

// Apply excel rows to the project docs (in memory). Returns what changed.
export function applyRows(project: Project, rows: Row[], languages: string[], opts: SyncOptions = {}): Change[] {
    const changes: Change[] = [];
    const added = new Set<string>();
    const missing = new Set<string>();
    const seenOptions = new Map<string, { target: { file: YamlFile; node: YAMLMap }; values: Set<string> }>();

    // Set localized values on a map node like `name: { en-US: … }`. Empty excel cells are skipped.
    const setLocalized = (file: YamlFile, parent: YAMLMap, prop: string, values: Localized, key: string, kind: "text-updated" | "name-updated") => {
        let node = parent.get(prop, true) as YAMLMap | undefined;
        for (const lang of languages) {
            const to = values[lang];
            if (!to) continue;
            const from = node && isMap(node) ? String(node.get(lang) ?? "") : "";
            if (from === to) continue;
            if (!node || !isMap(node)) { node = new YAMLMap(); parent.set(prop, node); }
            node.set(lang, to);
            file.dirty = true;
            if (!added.has(key)) changes.push({ kind, key, file: file.file, lang, from, to });
        }
    };

    for (const row of rows) {
        const parts = row.key.split(".");
        const [head] = parts;

        if (head === "translations") {
            const key = parts.slice(1).join(".");
            let hit = project.texts.get(key);
            if (!hit) {
                if (!Object.values(row.values).some(v => v)) continue;
                const file = project.newTextsFile();
                const parent = (file.doc.contents as YAMLMap).get("websiteTexts") as YAMLMap;
                hit = { file, parent };
                project.texts.set(key, hit);
                changes.push({ kind: "text-added", key, file: file.file });
                added.add(row.key);
            }
            setLocalized(hit.file, hit.parent, key, row.values, row.key, "text-updated");
            continue;
        }

        if (head !== "blocks" && head !== "pages") continue;
        const area = head;

        if (parts[1] === "fields") {
            const [, , id, prop] = parts;
            const target = project.fields[area].get(id);
            if (!target) { missing.add(`${area}.fields.${id}`); continue; }

            if (prop === "name" || prop === "description") {
                setLocalized(target.file, target.node, prop, row.values, row.key, "name-updated");
            } else if (prop === "options" && row.sub) {
                let option = target.node.get("option") as YAMLMap | undefined;
                if (!isMap(option)) { option = new YAMLMap(); target.node.set("option", option); }
                let items = option.get("items") as YAMLSeq | undefined;
                if (!isSeq(items)) { items = new YAMLSeq(); option.set("items", items); }

                const seen = seenOptions.get(row.key) ?? { target, values: new Set<string>() };
                seen.values.add(row.sub);
                seenOptions.set(row.key, seen);

                let item = items.items.find(i => isMap(i) && String(i.get("value")) === row.sub) as YAMLMap | undefined;
                if (!item) {
                    item = new YAMLMap();
                    item.set("value", row.sub);
                    items.add(item);
                    target.file.dirty = true;
                    changes.push({ kind: "option-added", key: row.key, value: row.sub, file: target.file.file });
                    added.add(`${row.key}[${row.sub}]`);
                }
                setLocalized(target.file, item, "name", row.values, `${row.key}[${row.sub}]`, "name-updated");
            }
            continue;
        }

        const [, id, prop, groupId] = parts;
        const target = project.templates[area].get(id);
        if (!target) { missing.add(`${area}.${id}`); continue; }
        if (prop === "name" || prop === "description") {
            setLocalized(target.file, target.node, prop, row.values, row.key, "name-updated");
        } else if (prop === "fieldGroups" && groupId) {
            const groups = target.node.get("fieldGroups");
            const group = isSeq(groups) ? (groups.items.find(g => isMap(g) && String(g.get("id")) === groupId) as YAMLMap | undefined) : undefined;
            if (!group) { missing.add(`${area}.${id}.fieldGroups.${groupId}`); continue; }
            setLocalized(target.file, group, "name", row.values, row.key, "name-updated");
        }
    }

    // Options in code but not on server.
    for (const [key, { target, values }] of seenOptions) {
        const items = (target.node.get("option") as YAMLMap).get("items") as YAMLSeq;
        for (const item of [...items.items]) {
            if (!isMap(item)) continue;
            const value = String(item.get("value"));
            if (values.has(value)) continue;
            if (opts.prune) {
                items.items.splice(items.items.indexOf(item), 1);
                target.file.dirty = true;
                changes.push({ kind: "option-removed", key, value, file: target.file.file });
            } else {
                changes.push({ kind: "option-missing-on-server", key, value, file: target.file.file });
            }
        }
    }

    for (const key of missing) changes.push({ kind: "not-in-project", key });
    return changes;
}
