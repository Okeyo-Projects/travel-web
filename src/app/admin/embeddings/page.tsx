'use client';

import { useState } from 'react';
import { CheckCircle, Loader2, Play, RefreshCw, XCircle } from 'lucide-react';
import type { PostgrestError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EmbeddingStats {
  total_experiences: number;
  with_embeddings: number;
  without_embeddings: number;
  percentage_complete: number;
}

interface EmbeddingRunResultItem {
  title: string;
  success: boolean;
}

interface EmbeddingRunResult {
  success: boolean;
  error?: string;
  processed?: number;
  successful?: number;
  failed?: number;
  results?: EmbeddingRunResultItem[];
}

type EmbeddingGenerateOptions = {
  maxExperiences?: number;
};

export default function EmbeddingsAdminPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [lastResult, setLastResult] = useState<EmbeddingRunResult | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const supabase = createClient();
      const rpc = supabase.rpc as unknown as (
        fn: string,
        args?: Record<string, unknown>
      ) => Promise<{ data: unknown; error: PostgrestError | null }>;
      const { data, error } = await rpc('get_embedding_stats');
      
      if (error) throw error;
      setStats(data as EmbeddingStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const generateEmbeddings = async (options: EmbeddingGenerateOptions = {}) => {
    setIsGenerating(true);
    setLastResult(null);
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-embeddings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options),
        }
      );

      const result = (await response.json()) as EmbeddingRunResult;
      setLastResult(result);
      
      // Refresh stats after generation
      await fetchStats();
    } catch (error) {
      console.error('Error generating embeddings:', error);
      setLastResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Embeddings Management</h1>
          <p className="text-muted-foreground mt-2">
            Generate and manage vector embeddings for semantic search
          </p>
        </div>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Embedding Statistics</CardTitle>
                <CardDescription>Current status of experience embeddings</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStats}
                disabled={isLoadingStats}
              >
                {isLoadingStats ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Experiences</p>
                  <p className="text-2xl font-bold">{stats.total_experiences}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">With Embeddings</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.with_embeddings}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Without Embeddings</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.without_embeddings}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Completion</p>
                  <p className="text-2xl font-bold">{stats.percentage_complete}%</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Button onClick={fetchStats} disabled={isLoadingStats}>
                  {isLoadingStats ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>Load Statistics</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Embeddings</CardTitle>
            <CardDescription>
              Trigger embedding generation manually or with options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={() => generateEmbeddings({ maxExperiences: 10 })}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Generate 10
              </Button>
              
              <Button
                onClick={() => generateEmbeddings({ maxExperiences: 50 })}
                disabled={isGenerating}
                variant="outline"
                className="w-full"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Generate 50
              </Button>
              
              <Button
                onClick={() => generateEmbeddings({})}
                disabled={isGenerating}
                variant="outline"
                className="w-full"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Generate All
              </Button>
            </div>

            {isGenerating && (
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating embeddings... This may take a few minutes.</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Card */}
        {lastResult && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Last Generation Result</CardTitle>
                {lastResult.success ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Success
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    Failed
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {lastResult.success ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Processed</p>
                      <p className="text-xl font-semibold">{lastResult.processed}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Successful</p>
                      <p className="text-xl font-semibold text-green-600">
                        {lastResult.successful}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Failed</p>
                      <p className="text-xl font-semibold text-red-600">
                        {lastResult.failed}
                      </p>
                    </div>
                  </div>

                  {lastResult.results && lastResult.results.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Details:</p>
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {lastResult.results.map((result, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                          >
                            <span className="truncate flex-1">{result.title}</span>
                            {result.success ? (
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-destructive/10 text-destructive p-4 rounded">
                  <p className="font-medium">Error:</p>
                  <p className="text-sm mt-1">{lastResult.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>About Embeddings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Vector embeddings enable semantic search, allowing the AI to understand
              the meaning of experiences rather than just matching keywords.
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Embeddings are generated using OpenAI's text-embedding-3-small model</li>
              <li>Each embedding is a 1536-dimensional vector</li>
              <li>Automatic cron job runs daily at 2 AM UTC</li>
              <li>Embeddings are regenerated when experience content changes</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
