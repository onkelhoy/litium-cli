import ExcelJS from "exceljs";
import type { Row } from "./types";

export async function writeExcel(file: string, languages: string[], rows: Row[]) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("translations");
    ws.columns = [
        { header: "key", key: "key", width: 60 },
        { header: "sub", key: "sub", width: 24 },
        ...languages.map(l => ({ header: l, key: l, width: 40 })),
    ];
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", xSplit: 2, ySplit: 1 }];
    for (const r of rows) ws.addRow({ key: r.key, sub: r.sub, ...r.values });
    await wb.xlsx.writeFile(file);
}

export async function readExcel(file: string): Promise<{ languages: string[]; rows: Row[] }> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    const ws = wb.worksheets[0];
    const header = (ws.getRow(1).values as any[]).slice(1).map(v => String(v ?? ""));
    const languages = header.slice(2);
    const rows: Row[] = [];
    let last = "";
    ws.eachRow((row, n) => {
        if (n === 1) return;
        const cell = (i: number) => String(row.getCell(i).text ?? "").trim();
        const key = cell(1);
        if (key) last = key;
        const values = Object.fromEntries(languages.map((l, i) => [l, cell(i + 3)]));
        rows.push({ key: key || last, sub: cell(2), values });
    });
    return { languages, rows };
}
