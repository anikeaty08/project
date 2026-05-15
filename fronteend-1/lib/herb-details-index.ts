import { herbDetails } from "./herb-descriptions";
import { herbDetailsExtra } from "./herb-descriptions-extra";
import type { HerbDetail } from "./herb-descriptions";

export type { HerbDetail };

export const allHerbDetails: Record<string, HerbDetail> = {
  ...herbDetails,
  ...herbDetailsExtra,
};
