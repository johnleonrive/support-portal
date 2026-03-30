'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseDebouncedSearchOptions<T> {
  items: T[];
  filterFn: (item: T, query: string) => boolean;
  apiFn?: (query: string) => Promise<T[]>;
  delay?: number;
}

export function useDebouncedSearch<T>({
  items,
  filterFn,
  apiFn,
  delay = 300,
}: UseDebouncedSearchOptions<T>) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>(items);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setResults(items);
  }, [items]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(items);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      // Local filter first
      const localResults = items.filter((item) => filterFn(item, query));

      if (localResults.length > 0 || !apiFn) {
        setResults(localResults);
        setIsSearching(false);
        return;
      }

      // Fall back to API search
      try {
        const apiResults = await apiFn(query);
        setResults(apiResults);
      } catch {
        setResults(localResults);
      } finally {
        setIsSearching(false);
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [query, items, filterFn, apiFn, delay]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(items);
  }, [items]);

  return { query, setQuery, results, isSearching, clearSearch };
}
