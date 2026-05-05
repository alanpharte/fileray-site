import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFindDuplicates, getFindDuplicatesQueryKey, useCheckNamingConventions, getCheckNamingConventionsQueryKey, useFindUnnamedFiles, getFindUnnamedFilesQueryKey, useFindOrphanFiles, getFindOrphanFilesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, FileText, Link2Off, SpellCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScopeLimitedBanner } from "@/components/ScopeLimitedBanner";

export function SmartOrganiser() {
  const { data: duplicates } = useFindDuplicates({ query: { queryKey: getFindDuplicatesQueryKey() } });
  const { data: naming } = useCheckNamingConventions({ query: { queryKey: getCheckNamingConventionsQueryKey() } });
  const { data: unnamed } = useFindUnnamedFiles({ query: { queryKey: getFindUnnamedFilesQueryKey() } });
  const { data: orphans } = useFindOrphanFiles({ query: { queryKey: getFindOrphanFilesQueryKey() } });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Smart Organiser</h2>
        <p className="text-muted-foreground mt-1">Clean up your Drive and enforce structure</p>
      </div>

      <Tabs defaultValue="duplicates" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50">
          <TabsTrigger value="duplicates" className="py-3 data-[state=active]:bg-card">
            <Copy className="mr-2 h-4 w-4" />
            Duplicates
          </TabsTrigger>
          <TabsTrigger value="naming" className="py-3 data-[state=active]:bg-card">
            <SpellCheck className="mr-2 h-4 w-4" />
            Naming Conventions
          </TabsTrigger>
          <TabsTrigger value="unnamed" className="py-3 data-[state=active]:bg-card">
            <FileText className="mr-2 h-4 w-4" />
            Untitled Files
          </TabsTrigger>
          <TabsTrigger value="orphans" className="py-3 data-[state=active]:bg-card">
            <Link2Off className="mr-2 h-4 w-4" />
            Orphan Files
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-6 border border-border bg-card rounded-lg min-h-[500px]">
          <TabsContent value="duplicates" className="m-0 p-6">
            <ScopeLimitedBanner
              feature="Cross-Drive duplicate detection"
              description="Finding duplicates across files you didn't create needs broader access than the launch scope provides."
            />
            <div className="mb-6">
              <h3 className="text-xl font-semibold">Duplicate Detector</h3>
              <p className="text-muted-foreground">Find exact copies of files scattered across your Drive.</p>
            </div>
            
            {duplicates?.length ? (
              <div className="space-y-6">
                {duplicates.map((group, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3 bg-muted/20">
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      <CardDescription>{group.files.length} copies found</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      {group.files.map(f => (
                        <div key={f.id} className="flex items-center justify-between p-2 rounded bg-background border border-border">
                          <div className="text-sm truncate flex-1 pr-4">{f.locationBreadcrumb || 'My Drive'}</div>
                          <div className="text-xs text-muted-foreground w-32">{f.size}</div>
                          <div className="text-xs text-muted-foreground w-32">{new Date(f.modifiedTime).toLocaleDateString()}</div>
                          <Button variant="outline" size="sm">Inspect</Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">No duplicates found. Your drive is clean!</div>
            )}
          </TabsContent>

          <TabsContent value="naming" className="m-0 p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold">Naming Convention Linter</h3>
              <p className="text-muted-foreground">Identify files that violate your team's naming rules.</p>
            </div>
            
            {naming?.length ? (
              <div className="space-y-4">
                {naming.map((v, i) => (
                  <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-lg bg-muted/10 gap-4">
                    <div className="flex-1">
                      <div className="text-sm text-destructive font-medium mb-1 line-through">{v.currentName}</div>
                      <div className="text-sm font-semibold text-primary">{v.suggestedName}</div>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded w-fit">
                      Violates: {v.rule}
                    </div>
                    <Button size="sm">Auto-Rename</Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">All files follow your naming conventions.</div>
            )}
          </TabsContent>

          <TabsContent value="unnamed" className="m-0 p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold">Untitled File Detector</h3>
              <p className="text-muted-foreground">Find files named "Untitled document" and get smart renaming suggestions based on content.</p>
            </div>
            
            {unnamed?.length ? (
              <div className="space-y-4">
                {unnamed.map((v, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg gap-4">
                    <div>
                      <div className="text-muted-foreground italic mb-1">{v.file.name}</div>
                      <div className="text-sm">Suggestion: <span className="font-medium text-foreground">{v.suggestedName}</span></div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Review</Button>
                      <Button size="sm">Apply Suggestion</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">No untitled documents found.</div>
            )}
          </TabsContent>

          <TabsContent value="orphans" className="m-0 p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold">Orphan Files</h3>
              <p className="text-muted-foreground">Files that lost their parent folders or are floating at the root level.</p>
            </div>
            
            {orphans?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orphans.map((v, i) => (
                  <Card key={i} className="shadow-none">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base truncate">{v.file.name}</CardTitle>
                      <CardDescription className="text-xs">Modified: {new Date(v.file.modifiedTime).toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex justify-between items-end mt-2">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Suggest: </span>
                        <span className="font-medium">{v.suggestedFolder || 'Archive'}</span>
                      </div>
                      <Button variant="secondary" size="sm">Move</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">No orphan files found. Everything is organized!</div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
