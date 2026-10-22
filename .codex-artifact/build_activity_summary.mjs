import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/User/Desktop/taiping-stamp/activity-data.xlsx";
const outputDir = "C:/Users/User/Desktop/taiping-stamp/outputs/01a12ef9-2f7a-7fb2-b670-beffa368f1b9";
const outputPath = `${outputDir}/活動統計_2026-10-09至2026-10-11.xlsx`;
const previewPath = `${outputDir}/活動統計預覽.png`;

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.add("活動統計");

const fontName = "Arial";
const darkBlue = "#1F4E78";
const headerBlue = "#4472C4";
const lightBlue = "#D9EAF7";
const paleBlue = "#EEF5FC";
const softGray = "#F3F4F6";
const warningFill = "#FFF2CC";
const borderColor = "#C8D3DF";
const darkText = "#1F2937";

sheet.showGridLines = false;
sheet.tabColor = darkBlue;

sheet.getRange("A2").values = [["活動電子集點兌換統計"]];
sheet.getRange("A3:F3").values = [[
  "統計期間",
  "2026/10/9–2026/10/11",
  "排除資料",
  "2026/10/8 測試核銷",
  "資料狀態",
  "活動結束統計",
]];

sheet.getRange("A5:F5").values = [["整體摘要", null, null, null, null, null]];
sheet.getRange("A6:F6").values = [["指標", "數值", "指標", "數值", "指標", "數值"]];
sheet.getRange("A7:F10").values = [
  ["實際發點店家", null, "發點筆數", null, "發送電子點數", null],
  ["收到點數遊客", null, "成功兌換商品", null, "電子點數使用", null],
  ["期末電子餘額", 164, "電子使用率", null, "遊客兌換率", null],
  ["使用過電子點遊客", 77, "完全使用點數遊客", 74, "未勾稽差額", null],
];

sheet.getRange("A12:F12").values = [["兌換方式", null, null, null, null, null]];
sheet.getRange("A13:F13").values = [["方式", "兌換數量", "占全部兌換", "電子點數", "紙本點數", "核銷總點數"]];
sheet.getRange("A14:F16").values = [
  ["全電子", 50, null, 407, 0, 407],
  ["電子＋紙本混合", 49, null, 144, 161, 305],
  ["全紙本（系統內有記錄）", 3, null, 0, 15, 15],
];
sheet.getRange("A17").values = [["合計"]];
sheet.getRange("B17:F17").formulas = [["=SUM(B14:B16)", "=SUM(C14:C16)", "=SUM(D14:D16)", "=SUM(E14:E16)", "=SUM(F14:F16)"]];
sheet.getRange("C14:C16").formulas = [["=B14/$B$17"], ["=B15/$B$17"], ["=B16/$B$17"]];

sheet.getRange("A20:H20").values = [["各商品兌換數量", null, null, null, null, null, null, null]];
sheet.getRange("A21:H21").values = [["商品ID", "商品名稱", "合計", "全電子", "混合", "全紙本", "電子點數", "紙本點數"]];
sheet.getRange("A22:H36").values = [
  ["G02", "茄芷袋乙個", 27, 16, 9, 2, 76, 31],
  ["G03", "太平雲梯平安米菓乙包", 20, 3, 16, 1, 41, 47],
  ["G11", "綜合養生菌菇", 8, 4, 4, 0, 52, 16],
  ["G12", "蓋婭莊園限定香氛卡乙張（款式擇一）", 8, 6, 2, 0, 73, 7],
  ["G07", "脆梅隨身包乙包", 7, 3, 4, 0, 35, 10],
  ["G06", "草仔粿或芋粿乙個（二擇一）", 6, 3, 3, 0, 28, 8],
  ["G09", "太平雲糕乙個", 5, 1, 4, 0, 17, 14],
  ["G14", "金萱茶包外帶禮盒", 4, 2, 2, 0, 43, 17],
  ["G15", "蓋婭莊園洗髮精或沐浴乳乙瓶（二擇一）", 4, 3, 1, 0, 64, 16],
  ["G16", "溫感馬克杯乙個", 4, 4, 0, 0, 80, 0],
  ["G04", "冬瓜妹茶葉蛋乙顆", 3, 2, 1, 0, 15, 3],
  ["G08", "鮮蝦貢丸湯乙碗", 3, 1, 2, 0, 13, 5],
  ["G01", "大巃頂茶包乙包", 1, 1, 0, 0, 5, 0],
  ["G05", "糖果一把抓乙次", 1, 1, 0, 0, 6, 0],
  ["G10", "空氣圖書館50元折價券（消費滿千可折抵）", 1, 0, 1, 0, 3, 2],
];
sheet.getRange("A37:B37").values = [["合計", null]];
sheet.getRange("C37:H37").formulas = [["=SUM(C22:C36)", "=SUM(D22:D36)", "=SUM(E22:E36)", "=SUM(F22:F36)", "=SUM(G22:G36)", "=SUM(H22:H36)"]];

sheet.getRange("A40:D40").values = [["有發送電子點數的店家", null, null, null]];
sheet.getRange("A41:D41").values = [["店家", "發點筆數", "發送點數", "不重複遊客"]];
sheet.getRange("A42:D60").values = [
  ["博揚活力小食之饗", 7, 60, 7],
  ["太平米菓", 28, 60, 27],
  ["巨梅", 21, 60, 19],
  ["是菇的味", 14, 60, 14],
  ["阿珠珠烏龍茶葉香腸", 5, 60, 2],
  ["雲境山城", 2, 60, 2],
  ["52號菇菇的家", 8, 57, 7],
  ["冬瓜妹人文概念店", 39, 57, 36],
  ["黑芝麻脆片", 6, 50, 5],
  ["三美養蜂", 5, 48, 4],
  ["潘圈圈", 7, 37, 7],
  ["在梅間", 6, 31, 6],
  ["巷仔內古早味小吃", 8, 20, 8],
  ["空氣圖書館", 2, 9, 2],
  ["山茶花茶居", 1, 8, 1],
  ["鮮味手工鮮蝦貢丸", 5, 7, 5],
  ["后咖啡", 5, 6, 5],
  ["陳家鋪子", 4, 5, 4],
  ["楊家古早味", 1, 1, 1],
];
sheet.getRange("A61").values = [["整體合計（遊客跨店去重）"]];
sheet.getRange("B61:C61").formulas = [["=SUM(B42:B60)", "=SUM(C42:C60)"]];
sheet.getRange("D61").values = [[126]];

sheet.getRange("A64:H64").values = [["資料說明", null, null, null, null, null, null, null]];
sheet.getRange("A65").values = [["統計期間"]];
sheet.getRange("B65").values = [["僅計入 2026/10/9–10/11；2026/10/8 的測試核銷不納入。​"]];
sheet.getRange("A66").values = [["電子使用率"]];
sheet.getRange("B66").values = [["電子核銷 551 點 ÷ 店家發送 696 點＝79.2%。"]];
sheet.getRange("A67").values = [["資料差異"]];
sheet.getRange("B67").values = [["發送 696 點－電子核銷 551 點－期末餘額 164 點＝－19 點；核銷紀錄與餘額尚有 19 點未勾稽。"]];
sheet.getRange("A68").values = [["紙本範圍"]];
sheet.getRange("B68").values = [["僅含資料庫內記錄的混合或全紙本核銷；額外未入庫的紙本資料不在本表統計範圍。"]];
sheet.getRange("A69").values = [["未兌換商品"]];
sheet.getRange("B69").values = [["植物槌染體驗券、瓷杯釉畫彩繪體驗券。"]];

// Summary formulas link the headline figures to the detailed sections below.
sheet.getRange("B7").formulas = [["=COUNTA(A42:A60)"]];
sheet.getRange("D7").formulas = [["=B61"]];
sheet.getRange("F7").formulas = [["=C61"]];
sheet.getRange("B8").formulas = [["=D61"]];
sheet.getRange("D8").formulas = [["=B17"]];
sheet.getRange("F8").formulas = [["=D17"]];
sheet.getRange("D9").formulas = [["=F8/F7"]];
sheet.getRange("F9").formulas = [["=B10/B8"]];
sheet.getRange("F10").formulas = [["=ABS(F7-F8-B9)"]];

// Base typography and alignment.
sheet.getRange("A1:H69").format.font = { name: fontName, size: 10, color: darkText };
sheet.getRange("A1:H69").format.verticalAlignment = "center";
sheet.getRange("A2").format.font = { name: fontName, size: 15, bold: true, color: darkBlue };
sheet.getRange("A3:F3").format.font = { name: fontName, size: 10, color: "#475569" };
sheet.getRange("A3:F3").format.rowHeight = 22;

for (const section of ["A5:F5", "A12:F12", "A20:H20", "A40:D40", "A64:H64"]) {
  const r = sheet.getRange(section);
  r.format.fill = lightBlue;
  r.format.font = { name: fontName, size: 10, bold: true, color: darkBlue };
  r.format.borders = { preset: "outside", style: "thin", color: borderColor };
  r.format.rowHeight = 22;
}

for (const header of ["A6:F6", "A13:F13", "A21:H21", "A41:D41"]) {
  const r = sheet.getRange(header);
  r.format.fill = headerBlue;
  r.format.font = { name: fontName, size: 10, bold: true, color: "#FFFFFF" };
  r.format.horizontalAlignment = "center";
  r.format.verticalAlignment = "center";
  r.format.borders = { preset: "all", style: "thin", color: "#FFFFFF" };
  r.format.rowHeight = 24;
}

sheet.getRange("A7:F10").format.borders = { preset: "inside", style: "thin", color: borderColor };
sheet.getRange("A7:F10").format.fill = paleBlue;
sheet.getRange("A7:A10").format.font = { name: fontName, size: 10, bold: true, color: darkText };
sheet.getRange("C7:C10").format.font = { name: fontName, size: 10, bold: true, color: darkText };
sheet.getRange("E7:E10").format.font = { name: fontName, size: 10, bold: true, color: darkText };
sheet.getRange("B7:B10").format.font = { name: fontName, size: 11, bold: true, color: darkBlue };
sheet.getRange("D7:D10").format.font = { name: fontName, size: 11, bold: true, color: darkBlue };
sheet.getRange("F7:F10").format.font = { name: fontName, size: 11, bold: true, color: darkBlue };
sheet.getRange("F10").format.fill = warningFill;

sheet.getRange("A14:F17").format.borders = { preset: "inside", style: "thin", color: borderColor };
sheet.getRange("A22:H37").format.borders = { preset: "inside", style: "thin", color: borderColor };
sheet.getRange("A42:D61").format.borders = { preset: "inside", style: "thin", color: borderColor };
for (const totalRow of ["A17:F17", "A37:H37", "A61:D61"]) {
  const r = sheet.getRange(totalRow);
  r.format.fill = softGray;
  r.format.font = { name: fontName, size: 10, bold: true, color: darkText };
  r.format.borders = { preset: "doubleBottom", style: "thin", color: darkBlue };
}

sheet.getRange("B7:B10").format.numberFormat = "#,##0";
sheet.getRange("D7:D8").format.numberFormat = "#,##0";
sheet.getRange("D9").format.numberFormat = "0.0%";
sheet.getRange("D10").format.numberFormat = "#,##0";
sheet.getRange("F7:F8").format.numberFormat = "#,##0";
sheet.getRange("F9").format.numberFormat = "0.0%";
sheet.getRange("F10").format.numberFormat = "#,##0";
sheet.getRange("B14:B17").format.numberFormat = "#,##0";
sheet.getRange("C14:C17").format.numberFormat = "0.0%";
sheet.getRange("D14:F17").format.numberFormat = "#,##0";
sheet.getRange("C22:H37").format.numberFormat = "#,##0";
sheet.getRange("B42:D61").format.numberFormat = "#,##0";

sheet.getRange("B7:B10").format.horizontalAlignment = "right";
sheet.getRange("D7:D10").format.horizontalAlignment = "right";
sheet.getRange("F7:F10").format.horizontalAlignment = "right";
sheet.getRange("B14:F17").format.horizontalAlignment = "right";
sheet.getRange("C22:H37").format.horizontalAlignment = "right";
sheet.getRange("B42:D61").format.horizontalAlignment = "right";
sheet.getRange("A22:A36").format.horizontalAlignment = "center";
sheet.getRange("B22:B36").format.wrapText = true;
sheet.getRange("B22:B36").format.rowHeight = 30;

sheet.getRange("A65:A69").format.font = { name: fontName, size: 10, bold: true, color: darkText };
sheet.getRange("A65:B69").format.fill = "#FAFAFA";
sheet.getRange("A65:B69").format.borders = { preset: "inside", style: "thin", color: borderColor };
sheet.getRange("B65:B69").format.wrapText = true;
sheet.getRange("A65:B69").format.rowHeight = 34;

sheet.getRange("A1:A69").format.columnWidth = 25;
sheet.getRange("B1:B69").format.columnWidth = 42;
sheet.getRange("C1:C69").format.columnWidth = 16;
sheet.getRange("D1:D69").format.columnWidth = 16;
sheet.getRange("E1:E69").format.columnWidth = 18;
sheet.getRange("F1:F69").format.columnWidth = 16;
sheet.getRange("G1:G69").format.columnWidth = 14;
sheet.getRange("H1:H69").format.columnWidth = 14;

sheet.freezePanes.freezeRows(3);

workbook.recalculate();

const check = await workbook.inspect({
  kind: "table",
  sheetId: "活動統計",
  range: "A1:H69",
  include: "values,formulas",
  tableMaxRows: 75,
  tableMaxCols: 8,
  maxChars: 18000,
});
console.log(check.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const preview = await workbook.render({
  sheetName: "活動統計",
  range: "A1:H69",
  scale: 1.1,
  format: "png",
});

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

console.log(`OUTPUT=${outputPath}`);
console.log(`PREVIEW=${previewPath}`);
