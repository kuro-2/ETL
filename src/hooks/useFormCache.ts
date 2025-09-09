import { useState, useEffect } from 'react';

const CACHE_PREFIX = 'onboarding_cache_';

export function useFormCache<T>(key: string, initialData: T) {
  // Create cache key
  const cacheKey = `${CACHE_PREFIX}${key}`;
  
  // Initialize state from cache or initial data
  const [data, setData] = useState<T>(() => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cached data:', e);
        return initialData;
      }
    }
    return initialData;
  });

  // Update cache when data changes
  useEffect(() => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to cache data:', e);
    }
  }, [data, cacheKey]);

  // Function to clear cache
  const clearCache = () => {
    try {
      localStorage.removeItem(cacheKey);
      setData(initialData);
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
  };

  return {
    data,
    setData,
    clearCache
  };
}

// Helper to clear all onboarding caches
export function clearAllFormCaches() {
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith(CACHE_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  } catch (e) {
    console.error('Failed to clear all caches:', e);
  }
}