import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const outputPath = "C:/Users/User/Desktop/taiping-stamp/outputs/01a12ef9-2f7a-7fb2-b670-beffa368f1b9/活動統計_2026-10-09至2026-10-11.xlsx";
const input = await FileBlob.load(outputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const sheets = await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 4000 });
console.log(sheets.ndjson);

const keyValues = await workbook.inspect({
  kind: "table",
  sheetId: "活動統計",
  range: "A5:F17",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 6,
  maxChars: 6000,
});
console.log(keyValues.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "saved file formula error scan",
});
console.log(errors.ndjson);
