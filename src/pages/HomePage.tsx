import { useCallback, useEffect, useState } from 'react';
import { ArticleList } from '../components/ArticleList';
import { mapErrorMessage } from '../lib/errors';
import { fetchArticles } from '../services/articles';
import type { ArticleSummary } from '../types/api';

export function HomePage() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);

  const loadArticles = useCallback(async () => {
    setArticlesLoading(true);
    setArticlesError(null);
    try {
      const data = await fetchArticles();
      setArticles(data);
    } catch (e) {
      setArticlesError(mapErrorMessage(e));
    } finally {
      setArticlesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  return (
    <>
      <header className="mb-8 flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          文章
        </h1>
        <p className="text-sm text-muted">学习过程中的记录与想法</p>
      </header>
      <ArticleList
        articles={articles}
        loading={articlesLoading}
        error={articlesError}
        onRetry={loadArticles}
        grouped={false}
      />
    </>
  );
}
