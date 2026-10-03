/**
 * The seven crop groups, in the order every crop list shows them. A crop belongs to
 * the first group whose words appear in its (lower-case) name; a crop no group knows is "other".
 */
export type CropGroupId = "cereals" | "fodder" | "openField" | "datePalm" | "fruitTrees" | "forestTrees" | "other";

export interface CropGroupInfo {
  id: CropGroupId;
  en: string;
  ar: string;
  /** The group's one colour in bars and dots. */
  color: string;
  /** Lower-case words; a crop name matches when one of its words starts with one, or a multi-word entry is in its name. */
  words: readonly string[];
}

export const CROP_GROUPS: ReadonlyArray<CropGroupInfo> = [
  { id: "cereals", en: "Cereals", ar: "الحبوب", color: "#d9a520", words: ["wheat", "barley", "sorghum", "maize", "corn", "millet", "oat", "rice", "cereal"] },
  { id: "fodder", en: "Fodder", ar: "الأعلاف", color: "#7fb069", words: ["alfalfa", "lucerne", "rhodes", "grass", "forage", "fodder", "clover", "sudan", "hay"] },
  {
    id: "openField",
    en: "Open field",
    ar: "الحقول المكشوفة",
    color: "#e07b39",
    words: [
      "tomato", "cucumber", "vegetable", "okra", "eggplant", "aubergine", "pepper", "capsicum", "lettuce", "squash", "zucchini", "melon",
      "watermelon", "onion", "potato", "cabbage", "cauliflower", "carrot", "spinach", "strawberr", "bean", "pumpkin", "radish", "leafy",
    ],
  },
  { id: "datePalm", en: "Date palm", ar: "نخيل التمر", color: "#1e7b4a", words: ["date", "palm"] },
  {
    id: "fruitTrees",
    en: "Fruit trees",
    ar: "أشجار الفاكهة",
    color: "#3b82c4",
    words: ["citrus", "lemon", "lime", "orange", "mango", "olive", "fig", "pomegranate", "banana", "guava", "papaya", "grape", "fruit", "tropical"],
  },
  { id: "forestTrees", en: "Forest trees", ar: "أشجار الغابات", color: "#8e5bd6", words: ["ghaf", "sidr", "acacia", "samar", "prosopis", "forest", "windbreak", "native"] },
  { id: "other", en: "Other", ar: "أخرى", color: "#94a3b8", words: [] },
];

const BY_ID = new Map(CROP_GROUPS.map((g) => [g.id, g]));

export function groupInfo(id: CropGroupId): CropGroupInfo {
  return BY_ID.get(id) ?? CROP_GROUPS[CROP_GROUPS.length - 1];
}

/** The group of a crop name ("Rhodes Grass" -> fodder, "Tomato" -> open field, an unknown name -> other). */
export function cropGroup(name: string): CropGroupId {
  const lower = name.trim().toLowerCase();
  const tokens = lower.split(/[^a-z]+/).filter(Boolean);
  for (const group of CROP_GROUPS) {
    if (group.words.some((word) => tokens.some((token) => token.startsWith(word)))) return group.id;
  }
  return "other";
}
