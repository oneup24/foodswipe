import { describe, it, expect } from "vitest";
import { MOCK_RESTAURANTS, getFilteredRestaurants } from "../lib/mock-data";
import type { FilterState } from "../lib/types";

describe("Mock Data", () => {
  it("should have at least 20 restaurants", () => {
    expect(MOCK_RESTAURANTS.length).toBeGreaterThanOrEqual(20);
  });

  it("each restaurant should have required fields", () => {
    for (const r of MOCK_RESTAURANTS) {
      expect(r.id).toBeTruthy();
      expect(r.name).toBeTruthy();
      expect(r.cuisine.length).toBeGreaterThan(0);
      expect(r.rating).toBeGreaterThanOrEqual(0);
      expect(r.rating).toBeLessThanOrEqual(5);
      expect([1, 2, 3, 4]).toContain(r.priceLevel);
      expect(r.distance).toBeGreaterThanOrEqual(0);
      expect(r.imageUrl).toMatch(/^https?:\/\//);
    }
  });
});

describe("getFilteredRestaurants", () => {
  const defaultFilters: FilterState = {
    cuisines: [],
    priceRange: [],
    maxDistance: 10,
    minRating: 0,
    openNow: false,
  };

  it("returns all restaurants with default filters", () => {
    const result = getFilteredRestaurants(MOCK_RESTAURANTS, defaultFilters);
    expect(result.length).toBe(MOCK_RESTAURANTS.length);
  });

  it("filters by cuisine", () => {
    const result = getFilteredRestaurants(MOCK_RESTAURANTS, {
      ...defaultFilters,
      cuisines: ["Japanese"],
    });
    expect(result.every((r) => r.cuisine.includes("Japanese"))).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("filters by price range", () => {
    const result = getFilteredRestaurants(MOCK_RESTAURANTS, {
      ...defaultFilters,
      priceRange: [1],
    });
    expect(result.every((r) => r.priceLevel === 1)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("filters by max distance", () => {
    const result = getFilteredRestaurants(MOCK_RESTAURANTS, {
      ...defaultFilters,
      maxDistance: 1.0,
    });
    expect(result.every((r) => r.distance <= 1.0)).toBe(true);
  });

  it("filters by minimum rating", () => {
    const result = getFilteredRestaurants(MOCK_RESTAURANTS, {
      ...defaultFilters,
      minRating: 4.5,
    });
    expect(result.every((r) => r.rating >= 4.5)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("filters open-now restaurants", () => {
    const result = getFilteredRestaurants(MOCK_RESTAURANTS, {
      ...defaultFilters,
      openNow: true,
    });
    expect(result.every((r) => r.isOpen)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty array when no restaurants match strict filters", () => {
    const result = getFilteredRestaurants(MOCK_RESTAURANTS, {
      ...defaultFilters,
      maxDistance: 0.01,
      minRating: 5.0,
    });
    expect(result.length).toBe(0);
  });
});
