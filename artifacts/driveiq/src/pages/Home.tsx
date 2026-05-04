import { useSearchFiles, getSearchFilesQueryKey, useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Home() {
  const [query, setQuery] = useState("");
  
  const { data: summary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: searchResults, isLoading } = useSearchFiles(
    { q: query },
    { query: { enabled: !!query, queryKey: getSearchFilesQueryKey({ q: query }) } }
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Summary Cards */}
      {!query && summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalFiles}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Shared With Me</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.sharedWithMeCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sharing Risks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-alert-amber">{summary.sharingRiskCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Stale Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.staleFileCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Search files across all Drive locations..." 
          className="pl-10 py-6 text-lg bg-card"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Search Results */}
      {query && (
        <div className="space-y-4">
          {isLoading ? (
            <div>Loading results...</div>
          ) : searchResults?.files?.length ? (
            <div className="grid gap-3">
              {searchResults.files.map(file => (
                <Card key={file.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer">
                  <div>
                    <h3 className="font-medium text-foreground">{file.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Modified {new Date(file.modifiedTime).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No files found matching "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
