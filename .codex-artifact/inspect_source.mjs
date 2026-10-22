import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/User/Desktop/taiping-stamp/activity-data.xlsx";
const previewPath = "C:/Users/User/Desktop/taiping-stamp/.codex-artifact/source-preview.png";

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "sheet,table,computedStyle",
  maxChars: 8000,
  tableMaxRows: 5,
  tableMaxCols: 8,
});
console.log(summary.ndjson);

const preview = await workbook.render({
  sheetName: "發點紀錄",
  range: "A1:H12",
  scale: 1.4,
  format: "png",
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
console.log(`PREVIEW=${previewPath}`);
