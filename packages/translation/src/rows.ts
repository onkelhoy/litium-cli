import { AREAS, GROUP_PROPS, type Area, type FieldGroup, type Localized, type Row, type Snapshot } from "./types";

const has = (v?: Localized) => !!v && Object.values(v).some(x => x);
const clean = (v: Localized | undefined, langs: string[]) => Object.fromEntries(langs.map(l => [l, v?.[l] ?? ""]));

export type RowOptions = { include: Set<"translations" | Area>; systemFields?: boolean };

// Snapshot -> excel rows.
// translations.<key>
// <area>.<template>.name | .description | .<groupProp>.<group>  (groupProp: fieldGroups, productFieldGroups, …)
// <area>.fields.<field>.name | .description | .options (one row per option, value in `sub`)
export function toRows(s: Snapshot, opts: RowOptions): Row[] {
    const L = s.languages;
    const rows: Row[] = [];
    const push = (key: string, v: Localized | undefined, sub = "") => rows.push({ key, sub, values: clean(v, L) });

    if (opts.include.has("translations")) {
        for (const key of Object.keys(s.texts).sort()) push(`translations.${key}`, s.texts[key]);
    }

    for (const area of AREAS) {
        if (!opts.include.has(area)) continue;

        for (const t of [...s.templates[area]].sort((a, b) => a.id.localeCompare(b.id))) {
            push(`${area}.${t.id}.name`, t.fields?._name);
            if (has(t.fields?._description)) push(`${area}.${t.id}.description`, t.fields?._description);
            for (const prop of GROUP_PROPS) {
                for (const g of (t[prop] ?? []) as FieldGroup[]) {
                    const name: Localized = {};
                    for (const [l, loc] of Object.entries(g.localizations ?? {})) if (loc?.name) name[l] = loc.name;
                    push(`${area}.${t.id}.${prop}.${g.id}`, name);
                }
            }
        }

        for (const f of [...s.fields[area]].sort((a, b) => a.id.localeCompare(b.id))) {
            if (f.systemDefined && !opts.systemFields) continue;
            push(`${area}.fields.${f.id}.name`, f.fields?._name);
            if (has(f.fields?._description)) push(`${area}.fields.${f.id}.description`, f.fields?._description);
            const items = f.fields?._option?.["*"]?.items ?? [];
            items.forEach((o, i) => push(i === 0 ? `${area}.fields.${f.id}.options` : "", o.name, o.value));
        }
    }
    return rows;
}
