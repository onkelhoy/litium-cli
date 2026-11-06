import fs from "node:fs";
import path from "node:path";
import YAML, { Document, isMap, isSeq, YAMLMap, YAMLSeq } from "yaml";

export type YamlFile = { file: string; doc: Document; dirty: boolean };

// Litium yaml roots per area.
const ROOTS = {
    texts: "websiteTexts",
    blocks: { templates: "blockTemplates", fields: "blockFields" },
    pages: { templates: "websiteTemplates", fields: "websiteFields" },
    products: { templates: "productTemplates", fields: "productFields" },
} as const;

export type Target = { file: YamlFile; node: YAMLMap };

export class Project {
    files: YamlFile[] = [];
    texts = new Map<string, { file: YamlFile; parent: YAMLMap }>();
    templates = { blocks: new Map<string, Target>(), pages: new Map<string, Target>(), products: new Map<string, Target>() };
    fields = { blocks: new Map<string, Target>(), pages: new Map<string, Target>(), products: new Map<string, Target>() };
    newTexts?: YamlFile;

    constructor(readonly litium: string) {
        for (const file of walk(litium)) {
            const doc = YAML.parseDocument(fs.readFileSync(file, "utf-8"));
            if (doc.errors.length || !isMap(doc.contents)) continue;
            const yf: YamlFile = { file, doc, dirty: false };
            this.files.push(yf);
            this.index(yf);
        }
    }

    private index(yf: YamlFile) {
        const root = yf.doc.contents as YAMLMap;
        // texts only from litium/translations/ (ignores translations-new etc.)
        const inTranslations = !path.relative(path.join(this.litium, "translations"), yf.file).startsWith("..");
        const texts = root.get(ROOTS.texts);
        if (inTranslations && isMap(texts)) for (const p of texts.items) this.texts.set(String((p.key as any)?.value ?? p.key), { file: yf, parent: texts });

        for (const area of ["blocks", "pages", "products"] as const) {
            const addAll = (key: string, into: Map<string, Target>, filter?: (n: YAMLMap) => boolean) => {
                const seq = root.get(key);
                if (!isSeq(seq)) return;
                for (const n of seq.items) if (isMap(n) && (!filter || filter(n))) into.set(String(n.get("id")), { file: yf, node: n });
            };
            addAll(ROOTS[area].templates, this.templates[area], area === "pages" ? n => n.get("type") !== "Website" : undefined);
            addAll(ROOTS[area].fields, this.fields[area]);
        }
    }

    newTextsFile(): YamlFile {
        if (this.newTexts) return this.newTexts;
        const file = path.join(this.litium, "translations", "_new.yaml");
        const existing = this.files.find(f => f.file === file);
        if (existing) return (this.newTexts = existing);
        const doc = new Document({ [ROOTS.texts]: {} });
        this.newTexts = { file, doc, dirty: false };
        this.files.push(this.newTexts);
        return this.newTexts;
    }

    save(): string[] {
        const written: string[] = [];
        for (const f of this.files) {
            if (!f.dirty) continue;
            fs.mkdirSync(path.dirname(f.file), { recursive: true });
            fs.writeFileSync(f.file, f.doc.toString({ lineWidth: 0 }));
            written.push(f.file);
        }
        return written;
    }
}

// Accept project root or its litium folder.
export function resolveLitium(p: string): string | null {
    const candidates = [p, path.join(p, "litium")];
    for (const c of candidates) if (fs.existsSync(path.join(c, "definitions")) || fs.existsSync(path.join(c, "translations"))) return c;
    return null;
}

function walk(dir: string): string[] {
    const out: string[] = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...walk(full));
        else if (/\.ya?ml$/i.test(e.name)) out.push(full);
    }
    return out;
}

export { YAMLMap, YAMLSeq };
