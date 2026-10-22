from collections import Counter, defaultdict
from pathlib import Path
import json
import math
import openpyxl


BOOK = Path(r"C:\Users\User\Desktop\taiping-stamp\activity-data.xlsx")


def clean(value):
    if isinstance(value, str):
        return value.strip()
    return value


def rows_as_dicts(sheet):
    values = list(sheet.iter_rows(values_only=True))
    if not values:
        return []
    headers = [clean(v) for v in values[0]]
    rows = []
    for raw in values[1:]:
        if not any(v not in (None, "") for v in raw):
            continue
        record = {}
        for index, header in enumerate(headers):
            if header not in (None, "") and index < len(raw):
                record[str(header)] = clean(raw[index])
        rows.append(record)
    return rows


def num(value):
    if value in (None, ""):
        return 0.0
    return float(value)


wb = openpyxl.load_workbook(BOOK, data_only=True, read_only=False)
issued = rows_as_dicts(wb["發點紀錄"])
visitors = rows_as_dicts(wb["遊客點數"])
redemptions = rows_as_dicts(wb["兌換紀錄"])
merchant_limits = rows_as_dicts(wb["店家點數額度"])
products = rows_as_dicts(wb["商品庫存"])

# Keep only real source rows.
issued = [r for r in issued if r.get("交易編號") or r.get("店家名稱")]
redemptions = [r for r in redemptions if r.get("核銷ID") or r.get("交易編號")]
visitors = [r for r in visitors if r.get("UID")]
merchant_limits = [r for r in merchant_limits if r.get("店家名稱")]
products = [r for r in products if r.get("商品ID")]

statuses = Counter(str(r.get("狀態")) for r in redemptions)
success = [r for r in redemptions if r.get("狀態") == "成功"]

# Issuance summary.
issued_by_store = defaultdict(lambda: {"events": 0, "points": 0.0, "visitor_ids": set(), "uid": None})
issued_by_visitor = defaultdict(float)
issue_dates = []
for r in issued:
    store = str(r.get("店家名稱") or "未填店家")
    visitor_uid = r.get("第 1 欄") or r.get("第1欄")
    pts = num(r.get("發送點數"))
    issued_by_store[store]["events"] += 1
    issued_by_store[store]["points"] += pts
    issued_by_store[store]["uid"] = r.get("店家UID")
    if visitor_uid:
        issued_by_store[store]["visitor_ids"].add(visitor_uid)
        issued_by_visitor[visitor_uid] += pts
    if r.get("時間"):
        issue_dates.append(str(r["時間"]))

# Visitor balances and inferred redemption by visitor.
balance_by_visitor = {r.get("UID"): num(r.get("總點數")) for r in visitors}
all_issued_visitors = set(issued_by_visitor)
visitor_recon = []
for uid in sorted(all_issued_visitors):
    issued_pts = issued_by_visitor[uid]
    balance = balance_by_visitor.get(uid)
    inferred_used = None if balance is None else issued_pts - balance
    visitor_recon.append({
        "uid": uid,
        "issued": issued_pts,
        "balance": balance,
        "inferred_used": inferred_used,
    })

# Redemptions by product and method.
method_summary = defaultdict(lambda: {"transactions": 0, "quantity": 0.0, "electronic_points": 0.0, "paper_points": 0.0, "total_points": 0.0})
product_summary = defaultdict(lambda: {
    "product_id": None,
    "transactions": 0,
    "quantity": 0.0,
    "electronic_transactions": 0,
    "electronic_quantity": 0.0,
    "mixed_transactions": 0,
    "mixed_quantity": 0.0,
    "paper_transactions": 0,
    "paper_quantity": 0.0,
    "electronic_points": 0.0,
    "paper_points": 0.0,
    "total_points": 0.0,
})
redemption_dates = []
for r in success:
    method = str(r.get("方式") or "未填")
    qty = num(r.get("兌換數量"))
    ep = num(r.get("電子扣點"))
    pp = num(r.get("紙本點數"))
    tp = num(r.get("總核銷點數"))
    ms = method_summary[method]
    ms["transactions"] += 1
    ms["quantity"] += qty
    ms["electronic_points"] += ep
    ms["paper_points"] += pp
    ms["total_points"] += tp

    name = str(r.get("商品名稱") or "未填商品")
    ps = product_summary[name]
    ps["product_id"] = r.get("商品ID")
    ps["transactions"] += 1
    ps["quantity"] += qty
    ps["electronic_points"] += ep
    ps["paper_points"] += pp
    ps["total_points"] += tp
    if method == "電子":
        ps["electronic_transactions"] += 1
        ps["electronic_quantity"] += qty
    elif method == "混合":
        ps["mixed_transactions"] += 1
        ps["mixed_quantity"] += qty
    elif method == "紙本":
        ps["paper_transactions"] += 1
        ps["paper_quantity"] += qty
    if r.get("核銷時間"):
        redemption_dates.append(str(r["核銷時間"]))

issued_total = sum(num(r.get("發送點數")) for r in issued)
redeemed_electronic_total = sum(num(r.get("電子扣點")) for r in success)
redeemed_paper_recorded = sum(num(r.get("紙本點數")) for r in success)
redeemed_total_points = sum(num(r.get("總核銷點數")) for r in success)
remaining_balance_total = sum(balance_by_visitor.values())

issue_tx_ids = [r.get("交易編號") for r in issued if r.get("交易編號")]
redeem_tx_ids = [r.get("交易編號") for r in redemptions if r.get("交易編號")]
redeem_ids = [r.get("核銷ID") for r in redemptions if r.get("核銷ID")]

limits_by_store = {}
for r in merchant_limits:
    limits_by_store[str(r.get("店家名稱")).strip()] = {
        "quota": num(r.get("電子總額度")),
        "sheet_issued": num(r.get("電子已發總點數")),
        "remaining": num(r.get("剩餘可發點數")),
    }

stores = []
for store, data in issued_by_store.items():
    row = {
        "store": store,
        "events": data["events"],
        "unique_visitors": len(data["visitor_ids"]),
        "issued_points": data["points"],
    }
    row.update(limits_by_store.get(store, {}))
    stores.append(row)
stores.sort(key=lambda x: (-x["issued_points"], x["store"]))

product_rows = []
for name, data in product_summary.items():
    row = {"product": name, **data}
    product_rows.append(row)
product_rows.sort(key=lambda x: (-x["quantity"], x["product_id"] or ""))

visitor_known = [v for v in visitor_recon if v["inferred_used"] is not None]
visitor_redeemers = [v for v in visitor_known if v["inferred_used"] > 0]
visitor_fully_used = [v for v in visitor_known if math.isclose(v["balance"], 0.0) and v["issued"] > 0]
visitor_negative = [v for v in visitor_known if v["inferred_used"] < -1e-9]
visitor_missing_balance = [v for v in visitor_recon if v["balance"] is None]

result = {
    "row_counts": {
        "issued": len(issued),
        "visitors": len(visitors),
        "redemptions_all": len(redemptions),
        "redemptions_success": len(success),
        "merchant_limits": len(merchant_limits),
        "products": len(products),
    },
    "date_range": {
        "issued_min": min(issue_dates) if issue_dates else None,
        "issued_max": max(issue_dates) if issue_dates else None,
        "redeem_min": min(redemption_dates) if redemption_dates else None,
        "redeem_max": max(redemption_dates) if redemption_dates else None,
    },
    "statuses": statuses,
    "overall": {
        "issued_stores": len(issued_by_store),
        "issue_events": len(issued),
        "issued_points": issued_total,
        "issued_unique_visitors": len(all_issued_visitors),
        "successful_redemption_transactions": len(success),
        "redeemed_quantity": sum(num(r.get("兌換數量")) for r in success),
        "redeemed_electronic_points": redeemed_electronic_total,
        "redeemed_recorded_paper_points": redeemed_paper_recorded,
        "redeemed_total_points": redeemed_total_points,
        "remaining_electronic_balance": remaining_balance_total,
        "electronic_point_usage_rate": redeemed_electronic_total / issued_total if issued_total else None,
        "reconciliation_issued_minus_redeemed_minus_balance": issued_total - redeemed_electronic_total - remaining_balance_total,
        "known_issued_visitors": len(visitor_known),
        "inferred_unique_redeemers": len(visitor_redeemers),
        "inferred_redeemer_rate": len(visitor_redeemers) / len(visitor_known) if visitor_known else None,
        "fully_used_visitors": len(visitor_fully_used),
        "missing_visitor_balance_records": len(visitor_missing_balance),
        "negative_inferred_use_records": len(visitor_negative),
    },
    "methods": dict(method_summary),
    "stores": stores,
    "products": product_rows,
    "quality": {
        "duplicate_issue_transaction_ids": len(issue_tx_ids) - len(set(issue_tx_ids)),
        "duplicate_redemption_transaction_ids": len(redeem_tx_ids) - len(set(redeem_tx_ids)),
        "duplicate_redemption_ids": len(redeem_ids) - len(set(redeem_ids)),
        "success_point_mismatches": sum(1 for r in success if not math.isclose(num(r.get("電子扣點")) + num(r.get("紙本點數")), num(r.get("總核銷點數")), abs_tol=1e-9)),
        "issued_vs_store_sheet_mismatches": [
            {
                "store": s["store"],
                "calculated": s["issued_points"],
                "sheet_issued": s.get("sheet_issued"),
            }
            for s in stores
            if "sheet_issued" in s and not math.isclose(s["issued_points"], s["sheet_issued"], abs_tol=1e-9)
        ],
    },
}

print(json.dumps(result, ensure_ascii=True, indent=2, default=str))
