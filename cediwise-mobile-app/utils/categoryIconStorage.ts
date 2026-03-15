/**
 * Persist custom category icons by category ID.
 * Used when user creates a category with a chosen icon.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CategoryIconName } from '@/constants/categoryIcons';

const STORAGE_KEY = '@cediwise/budget_category_icons';

let cache: Record<string, CategoryIconName> = {};
let hasLoaded = false;

async function load(): Promise<Record<string, CategoryIconName>> {
  if (hasLoaded) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (typeof parsed === 'object' && parsed !== null) {
      cache = parsed as Record<string, CategoryIconName>;
    }
  } catch {
    // ignore
  }
  hasLoaded = true;
  return cache;
}

async function save(data: Record<string, CategoryIconName>): Promise<void> {
  cache = data;
  hasLoaded = true;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function getCategoryIcon(categoryId: string): Promise<CategoryIconName | null> {
  const map = await load();
  return map[categoryId] ?? null;
}

export async function setCategoryIcon(
  categoryId: string,
  icon: CategoryIconName
): Promise<void> {
  const map = await load();
  map[categoryId] = icon;
  await save(map);
}

export async function removeCategoryIcon(categoryId: string): Promise<void> {
  const map = await load();
  delete map[categoryId];
  await save(map);
}

export async function getAllCategoryIcons(): Promise<Record<string, CategoryIconName>> {
  return load();
}
