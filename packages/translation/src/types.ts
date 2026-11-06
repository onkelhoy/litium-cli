export type Credentials = { url: string; clientId: string; clientSecret: string };

export type Localized = Record<string, string>;

// One excel row. `key` is empty on continuation rows (options), `sub` holds the option value.
export type Row = { key: string; sub: string; values: Localized };

export type Language = { id: string; systemId: string };
export type Website = { systemId: string; texts?: Record<string, Localized>; fields?: { _name?: Localized } };

export type FieldGroup = { id: string; fields?: string[]; localizations?: Record<string, { name?: string; description?: string }> };
export type FieldTemplate = { $type?: string; id: string; systemId: string; fields?: { _name?: Localized; _description?: Localized }; fieldGroups?: FieldGroup[] };

export type OptionItem = { value: string; name?: Localized };
export type FieldDefinition = {
    id: string;
    fieldType: string;
    systemDefined?: boolean;
    fields?: { _name?: Localized; _description?: Localized; _option?: { "*"?: { items?: OptionItem[] } } };
};

export type Area = "blocks" | "pages";
export type Snapshot = {
    languages: string[];
    texts: Record<string, Localized>;
    templates: Record<Area, FieldTemplate[]>;
    fields: Record<Area, FieldDefinition[]>;
};
