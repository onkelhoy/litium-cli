import { Terminal } from "@papit/terminal";
import { Arguments } from "@papit/arguments";
import { LitiumApi } from "./api";
import type { FieldDefinition, FieldTemplate, Language, Snapshot, Website } from "./types";

export const ENDPOINTS = {
    languages: "/Litium/api/admin/globalization/languages",
    websites: "/Litium/api/admin/websites/websites",
    pageTemplates: "/Litium/api/admin/websites/fieldTemplates",
    pageFields: "/Litium/api/admin/websites/fieldDefinitions",
    blockTemplates: "/Litium/api/admin/blocks/fieldTemplates",
    blockFields: "/Litium/api/admin/blocks/fieldDefinitions",
} as const;

const list = <T>(r: any): T[] => (Array.isArray(r) ? r : r?.items ?? []);

export async function fetchSnapshot(api: LitiumApi, update: (t: string) => void): Promise<Snapshot> {
    update("languages");
    const languages = list<Language>(await api.get(ENDPOINTS.languages)).map(l => l.id).sort();

    update("websites");
    const websites = list<Website>(await api.get(ENDPOINTS.websites));
    const website = await pickWebsite(websites);

    update("templates and fields");
    const [pageTemplates, pageFields, blockTemplates, blockFields] = await Promise.all([
        api.get(ENDPOINTS.pageTemplates), api.get(ENDPOINTS.pageFields),
        api.get(ENDPOINTS.blockTemplates), api.get(ENDPOINTS.blockFields),
    ]);

    return {
        languages,
        texts: website?.texts ?? {},
        templates: {
            // websites/fieldTemplates also holds the WebsiteFieldTemplate, only pages wanted
            pages: list<FieldTemplate>(pageTemplates).filter(t => !t.$type || /PageFieldTemplate/.test(t.$type)),
            blocks: list<FieldTemplate>(blockTemplates),
        },
        fields: { pages: list<FieldDefinition>(pageFields), blocks: list<FieldDefinition>(blockFields) },
    };
}

async function pickWebsite(websites: Website[]): Promise<Website | undefined> {
    if (websites.length <= 1) return websites[0];
    const arg = Arguments.string("website");
    const label = (w: Website) => w.fields?._name?.["en-US"] ?? Object.values(w.fields?._name ?? {})[0] ?? w.systemId;
    const hit = arg && websites.find(w => w.systemId === arg || label(w) === arg);
    if (hit) return hit;
    Terminal.createSession();
    Terminal.write("which website (translations)?");
    const { index } = await Terminal.option(websites.map(label));
    Terminal.clearSession();
    return websites[index];
}
