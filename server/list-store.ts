export type SharedListEntry = {
  name: string;
  emoji: string;
  description: string;
  restaurants: {
    id: string;
    name: string;
    cuisine: string[];
    rating: number;
    priceLevel: number;
    imageUrl: string;
    address: string;
  }[];
  createdAt: number;
};

export const sharedListStore = new Map<string, SharedListEntry>();
