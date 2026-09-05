/**
 * DealFlow360 - High Performance Native FP-Growth & Association Rules Engine
 * -------------------------------------------------------------------------
 * Implements Han et al. Frequent Pattern Growth (FP-Tree) algorithm and
 * association rule mining (Support, Confidence, Lift) directly in TypeScript.
 */

export interface FrequentItemset {
  items: string[];
  count: number;
  support: number;
}

export interface AssociationRule {
  antecedents: string[];
  consequents: string[];
  support: number;
  confidence: number;
  lift: number;
}

class FPTreeNode {
  item: string | null;
  count: number;
  parent: FPTreeNode | null;
  children: Map<string, FPTreeNode>;
  nodeLink: FPTreeNode | null;

  constructor(item: string | null = null, count: number = 0, parent: FPTreeNode | null = null) {
    this.item = item;
    this.count = count;
    this.parent = parent;
    this.children = new Map();
    this.nodeLink = null;
  }
}

class FPTree {
  root: FPTreeNode;
  headerTable: Map<string, { count: number; head: FPTreeNode | null }>;

  constructor() {
    this.root = new FPTreeNode();
    this.headerTable = new Map();
  }

  insert(items: string[], count: number = 1): void {
    let currentNode = this.root;

    for (const item of items) {
      if (currentNode.children.has(item)) {
        const child = currentNode.children.get(item)!;
        child.count += count;
        currentNode = child;
      } else {
        const newNode = new FPTreeNode(item, count, currentNode);
        currentNode.children.set(item, newNode);

        // Update header table link
        const header = this.headerTable.get(item);
        if (header) {
          if (!header.head) {
            header.head = newNode;
          } else {
            let curr = header.head;
            while (curr.nodeLink) {
              curr = curr.nodeLink;
            }
            curr.nodeLink = newNode;
          }
        }

        currentNode = newNode;
      }
    }
  }
}

export class FPGrowthEngine {
  /**
   * Mine frequent itemsets from an array of transactions (baskets)
   * @param transactions Array of product ID arrays
   * @param minSupport Minimum support threshold (0.0 to 1.0)
   */
  static mineFrequentItemsets(transactions: string[][], minSupport: number = 0.05): FrequentItemset[] {
    const totalTransactions = transactions.length;
    if (totalTransactions === 0) return [];

    const minCount = Math.max(1, Math.ceil(minSupport * totalTransactions));

    // Pass 1: Count individual item frequencies
    const itemCounts = new Map<string, number>();
    for (const transaction of transactions) {
      const uniqueItems = new Set(transaction);
      for (const item of uniqueItems) {
        itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
      }
    }

    // Filter items meeting minSupport
    const frequentItems = new Map<string, number>();
    for (const [item, count] of itemCounts.entries()) {
      if (count >= minCount) {
        frequentItems.set(item, count);
      }
    }

    if (frequentItems.size === 0) return [];

    // Initialize header table sorted descending by frequency
    const tree = new FPTree();
    const sortedItems = Array.from(frequentItems.entries()).sort((a, b) => b[1] - a[1]);
    for (const [item, count] of sortedItems) {
      tree.headerTable.set(item, { count, head: null });
    }

    // Pass 2: Insert filtered and sorted items into FP-Tree
    for (const transaction of transactions) {
      const filtered = transaction
        .filter((item) => frequentItems.has(item))
        .sort((a, b) => {
          const countDiff = frequentItems.get(b)! - frequentItems.get(a)!;
          return countDiff !== 0 ? countDiff : a.localeCompare(b);
        });

      if (filtered.length > 0) {
        tree.insert(filtered, 1);
      }
    }

    // Mine frequent patterns recursively
    const frequentItemsets: FrequentItemset[] = [];
    this.minePatterns(tree, [], minCount, totalTransactions, frequentItemsets);

    return frequentItemsets;
  }

  private static minePatterns(
    tree: FPTree,
    prefix: string[],
    minCount: number,
    totalTransactions: number,
    results: FrequentItemset[],
  ): void {
    // Process items in header table in ascending frequency order (reverse of insertion)
    const headerEntries = Array.from(tree.headerTable.entries()).reverse();

    for (const [item, header] of headerEntries) {
      const newPrefix = [...prefix, item];
      results.push({
        items: newPrefix,
        count: header.count,
        support: Number((header.count / totalTransactions).toFixed(4)),
      });

      // Construct conditional pattern base for item
      const conditionalPaths: { path: string[]; count: number }[] = [];
      let currentNode = header.head;

      while (currentNode) {
        const count = currentNode.count;
        const path: string[] = [];
        let parent = currentNode.parent;

        while (parent && parent.item !== null) {
          path.unshift(parent.item);
          parent = parent.parent;
        }

        if (path.length > 0) {
          conditionalPaths.push({ path, count });
        }

        currentNode = currentNode.nodeLink;
      }

      // Build conditional FP-tree
      const condTree = new FPTree();
      const condCounts = new Map<string, number>();

      for (const { path, count } of conditionalPaths) {
        for (const pItem of path) {
          condCounts.set(pItem, (condCounts.get(pItem) || 0) + count);
        }
      }

      const condFrequent = new Map<string, number>();
      for (const [pItem, count] of condCounts.entries()) {
        if (count >= minCount) {
          condFrequent.set(pItem, count);
        }
      }

      if (condFrequent.size > 0) {
        const condSorted = Array.from(condFrequent.entries()).sort((a, b) => b[1] - a[1]);
        for (const [cItem, cCount] of condSorted) {
          condTree.headerTable.set(cItem, { count: cCount, head: null });
        }

        for (const { path, count } of conditionalPaths) {
          const filteredPath = path
            .filter((p) => condFrequent.has(p))
            .sort((a, b) => condFrequent.get(b)! - condFrequent.get(a)!);

          if (filteredPath.length > 0) {
            condTree.insert(filteredPath, count);
          }
        }

        this.minePatterns(condTree, newPrefix, minCount, totalTransactions, results);
      }
    }
  }

  /**
   * Extract association rules from mined frequent itemsets
   * Rule format: Antecedent => Consequent
   */
  static generateAssociationRules(
    itemsets: FrequentItemset[],
    totalTransactions: number,
    minConfidence: number = 0.25,
    minLift: number = 1.0,
  ): AssociationRule[] {
    const itemsetMap = new Map<string, number>();
    for (const itemset of itemsets) {
      const key = [...itemset.items].sort().join(':::');
      itemsetMap.set(key, itemset.count);
    }

    const rules: AssociationRule[] = [];

    // Consider itemsets of size >= 2
    const multiItemsets = itemsets.filter((i) => i.items.length >= 2);

    for (const itemset of multiItemsets) {
      const items = itemset.items;
      const fullCount = itemset.count;
      const fullSupport = itemset.support;

      // Generate all non-empty proper subsets as antecedents
      const subsets = this.getSubsets(items);

      for (const antecedent of subsets) {
        if (antecedent.length === 0 || antecedent.length === items.length) continue;

        const consequent = items.filter((item) => !antecedent.includes(item));
        if (consequent.length === 0) continue;

        const antKey = [...antecedent].sort().join(':::');
        const conKey = [...consequent].sort().join(':::');

        const antCount = itemsetMap.get(antKey);
        const conCount = itemsetMap.get(conKey);

        if (!antCount || !conCount) continue;

        const confidence = fullCount / antCount;
        const conSupport = conCount / totalTransactions;
        const lift = confidence / (conSupport || 0.0001);

        if (confidence >= minConfidence && lift >= minLift) {
          rules.push({
            antecedents: antecedent,
            consequents: consequent,
            support: fullSupport,
            confidence: Number(confidence.toFixed(4)),
            lift: Number(lift.toFixed(2)),
          });
        }
      }
    }

    return rules.sort((a, b) => b.lift - a.lift);
  }

  private static getSubsets(arr: string[]): string[][] {
    const result: string[][] = [[]];
    for (const value of arr) {
      const len = result.length;
      for (let i = 0; i < len; i++) {
        result.push([...result[i], value]);
      }
    }
    return result;
  }
}
