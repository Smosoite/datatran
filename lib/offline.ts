import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

/**
 * Helper to fetch data with offline fallback.
 * * @param key Unique key for caching (e.g., 'dashboard_restock_items')
 * @param fetcher The async function to call Supabase (must return { data, error })
 * @returns { data, error, isOfflineData }
 */
export async function fetchWithCache<T>(key: string, fetcher: () => Promise<{ data: T | null; error: any }>) {
  // 1. Check Connection
  const state = await NetInfo.fetch();
  const isConnected = state.isConnected && state.isInternetReachable !== false;

  if (isConnected) {
    try {
      // 2. Online: Fetch fresh data
      const { data, error } = await fetcher();
      
      if (error) throw error;

      // 3. Save to Cache
      if (data) {
        await AsyncStorage.setItem(`CACHE_${key}`, JSON.stringify(data));
      }
      
      return { data, error: null, isOfflineData: false };

    } catch (err) {
      console.warn("Fetch failed, trying cache:", err);
      // Fallback logic below...
    }
  }

  // 4. Offline (or fetch failed): Read from Cache
  try {
    const cached = await AsyncStorage.getItem(`CACHE_${key}`);
    if (cached) {
      return { data: JSON.parse(cached) as T, error: null, isOfflineData: true };
    }
  } catch (cacheErr) {
    console.error("Cache read error:", cacheErr);
  }

  // 5. No connection AND no cache
  return { data: null, error: { message: "No internet connection and no cached data." }, isOfflineData: true };
}