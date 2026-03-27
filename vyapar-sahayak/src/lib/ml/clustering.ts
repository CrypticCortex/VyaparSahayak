// src/lib/ml/clustering.ts

import { kmeans } from "ml-kmeans";

export interface RetailerProfile {
  retailerId: string;
  name: string;
  zoneCode: string;
  purchaseFrequency: number;
  avgOrderValue: number;
  categoryDiversity: number;
  totalPurchaseValue: number;
}

export interface ClusteredRetailer extends RetailerProfile {
  segment: "platinum" | "gold" | "silver" | "new";
  clusterId: number;
}

const SEGMENT_LABELS: Record<number, ClusteredRetailer["segment"]> = {
  0: "platinum",
  1: "gold",
  2: "silver",
  3: "new",
};

export function clusterRetailers(
  profiles: RetailerProfile[]
): ClusteredRetailer[] {
  if (profiles.length < 4) {
    return profiles.map((p) => ({ ...p, segment: "silver", clusterId: 2 }));
  }

  const features = profiles.map((p) => [
    p.purchaseFrequency,
    p.avgOrderValue / 1000,
    p.categoryDiversity,
    p.totalPurchaseValue / 10000,
  ]);

  const result = kmeans(features, 4, {
    initialization: "kmeans++",
    maxIterations: 100,
  });

  // Rank centroids by avgOrderValue dimension (index 1) for more meaningful segmentation
  const centroidMagnitudes = result.centroids.map((c, i) => ({
    idx: i,
    magnitude: c[1] + c[3] * 0.5, // weight avgOrderValue + totalPurchaseValue
  }));
  centroidMagnitudes.sort((a, b) => b.magnitude - a.magnitude);

  const clusterToSegment: Record<number, ClusteredRetailer["segment"]> = {};
  centroidMagnitudes.forEach((c, rank) => {
    clusterToSegment[c.idx] = SEGMENT_LABELS[rank] || "silver";
  });

  return profiles.map((p, i) => ({
    ...p,
    clusterId: result.clusters[i],
    segment: clusterToSegment[result.clusters[i]],
  }));
}
