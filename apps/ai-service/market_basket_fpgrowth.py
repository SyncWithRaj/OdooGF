#!/usr/bin/env python3
"""
DealFlow360 - Market Basket Analysis & Affinity Engine
Algorithm: FP-Growth + Association Rule Mining (mlxtend)
Formula: Lift x Margin% x (1 + PromoBoost) x Multi-item Bonus

This script extracts historical B2B deal transactions, transforms them into
one-hot encoded itemsets, mines frequent itemsets with FP-Growth (faster than Apriori),
and generates directional association rules {Antecedent} -> {Consequent}.
"""

import sys
import json
import argparse
from typing import List, Dict, Any

# Mock catalog metadata for margin and promo calculations
CATALOG = {
    "HW-LAP-PRO14": {"name": "Laptop Pro 14", "price": 1200.0, "cost": 800.0, "promoted": False},
    "HW-DOC-STN": {"name": "Docking Station", "price": 180.0, "cost": 90.0, "promoted": True},
    "HW-MOU-WRL": {"name": "Wireless Ergonomic Mouse", "price": 45.0, "cost": 20.0, "promoted": True},
    "SRV-ONSITE-SET": {"name": "Onsite Setup Service", "price": 450.0, "cost": 350.0, "promoted": False},
    "SUB-CARE-2YR": {"name": "Care Plan 2yr", "price": 46.0, "cost": 15.0, "promoted": True},
    "SUB-SLA-QTR": {"name": "Support SLA 24/7", "price": 300.0, "cost": 120.0, "promoted": False},
}

SAMPLE_TRANSACTIONS = [
    ["HW-LAP-PRO14", "HW-DOC-STN", "HW-MOU-WRL", "SUB-CARE-2YR"],
    ["HW-LAP-PRO14", "HW-MOU-WRL", "SUB-CARE-2YR"],
    ["HW-LAP-PRO14", "HW-DOC-STN", "SUB-CARE-2YR"],
    ["HW-LAP-PRO14", "HW-MOU-WRL", "SRV-ONSITE-SET"],
    ["HW-DOC-STN", "HW-MOU-WRL"],
    ["HW-LAP-PRO14", "HW-DOC-STN", "HW-MOU-WRL", "SRV-ONSITE-SET"],
    ["HW-LAP-PRO14", "SUB-CARE-2YR", "SUB-SLA-QTR"],
    ["HW-LAP-PRO14", "HW-MOU-WRL"],
    ["HW-DOC-STN", "HW-MOU-WRL", "SUB-CARE-2YR"],
    ["HW-LAP-PRO14", "HW-DOC-STN", "SRV-ONSITE-SET"],
]


def run_fpgrowth_ml(transactions: List[List[str]], min_support: float = 0.1, min_lift: float = 1.05):
    """
    Executes FP-Growth using mlxtend if installed, otherwise falls back to
    built-in native FP-tree association rule miner.
    """
    try:
        import pandas as pd
        from mlxtend.preprocessing import TransactionEncoder
        from mlxtend.frequent_patterns import fpgrowth, association_rules

        te = TransactionEncoder()
        te_ary = te.fit(transactions).transform(transactions)
        df = pd.DataFrame(te_ary, columns=te.columns_)

        frequent_itemsets = fpgrowth(df, min_support=min_support, use_colnames=True)
        if frequent_itemsets.empty:
            return []

        rules = association_rules(frequent_itemsets, metric="lift", min_threshold=min_lift)
        
        extracted_rules = []
        for _, row in rules.iterrows():
            extracted_rules.append({
                "antecedents": list(row["antecedents"]),
                "consequents": list(row["consequents"]),
                "support": float(row["support"]),
                "confidence": float(row["confidence"]),
                "lift": float(row["lift"]),
            })
        return extracted_rules
    except ImportError:
        # Fallback pure-Python frequent pattern miner
        return fallback_mine_rules(transactions, min_support, min_lift)


def fallback_mine_rules(transactions: List[List[str]], min_support: float, min_lift: float):
    """Zero-dependency fallback mining when mlxtend is not installed in the environment."""
    total = len(transactions)
    item_counts: Dict[str, int] = {}
    pair_counts: Dict[tuple, int] = {}

    for t in transactions:
        unique_t = sorted(list(set(t)))
        for item in unique_t:
            item_counts[item] = item_counts.get(item, 0) + 1
        for i in range(len(unique_t)):
            for j in range(i + 1, len(unique_t)):
                pair = (unique_t[i], unique_t[j])
                pair_counts[pair] = pair_counts.get(pair, 0) + 1

    rules = []
    for (a, b), count in pair_counts.items():
        support_ab = count / total
        if support_ab < min_support:
            continue
        support_a = item_counts[a] / total
        support_b = item_counts[b] / total

        # Direction 1: a -> b
        conf_a_b = support_ab / support_a
        lift_a_b = conf_a_b / support_b
        if lift_a_b >= min_lift:
            rules.append({
                "antecedents": [a],
                "consequents": [b],
                "support": round(support_ab, 3),
                "confidence": round(conf_a_b, 3),
                "lift": round(lift_a_b, 3),
            })

        # Direction 2: b -> a
        conf_b_a = support_ab / support_b
        lift_b_a = conf_b_a / support_a
        if lift_b_a >= min_lift:
            rules.append({
                "antecedents": [b],
                "consequents": [a],
                "support": round(support_ab, 3),
                "confidence": round(conf_b_a, 3),
                "lift": round(lift_b_a, 3),
            })

    return rules


def recommend_for_cart(cart_items: List[str], transactions: List[List[str]] = SAMPLE_TRANSACTIONS) -> List[Dict[str, Any]]:
    rules = run_fpgrowth_ml(transactions)
    cart_set = set(cart_items)
    candidates = {}

    for rule in rules:
        antecedents = set(rule["antecedents"])
        consequents = [c for c in rule["consequents"] if c not in cart_set]

        # Check if cart contains the rule antecedent
        if antecedents.issubset(cart_set) and consequents:
            for c in consequents:
                meta = CATALOG.get(c, {"name": c, "price": 100.0, "cost": 50.0, "promoted": False})
                price = meta["price"]
                cost = meta["cost"]
                margin_pct = round(((price - cost) / price) * 100, 1) if price > 0 else 0
                promo_boost = 1.3 if meta["promoted"] else 1.0
                order_bonus = 1.25 if len(antecedents) > 1 else 1.0

                # DealFlow360 Composite Score Formula
                composite_score = round(rule["lift"] * (margin_pct / 100) * promo_boost * order_bonus * 10, 2)

                if c not in candidates or composite_score > candidates[c]["score"]:
                    candidates[c] = {
                        "sku": c,
                        "name": meta["name"],
                        "price": price,
                        "cost": cost,
                        "marginPercent": margin_pct,
                        "support": rule["support"],
                        "confidence": rule["confidence"],
                        "lift": rule["lift"],
                        "promoted": meta["promoted"],
                        "score": composite_score,
                        "reason": f"Mined via FP-Growth from antecedent {list(antecedents)} (Lift: {rule['lift']}x, Margin: {margin_pct}%)",
                    }

    # Sort candidates by composite score descending
    ranked = sorted(candidates.values(), key=lambda x: x["score"], reverse=True)
    return ranked


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DealFlow360 FP-Growth Affinity Recommendation Engine")
    parser.add_argument("--cart", nargs="+", default=["HW-LAP-PRO14"], help="Current items in quote cart")
    args = parser.parse_args()

    recommendations = recommend_for_cart(args.cart)
    print(f"\n=======================================================")
    print(f"DealFlow360 AI Affinity Recommendations for Cart: {args.cart}")
    print(f"=======================================================")
    print(json.dumps(recommendations, indent=2))
