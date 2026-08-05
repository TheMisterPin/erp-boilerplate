import { Skeleton } from "@/components/ui/skeleton"

/** Suspense fallback matching the centered login form layout. */
export function LoginSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16"
      aria-busy="true"
      aria-label="Loading…"
    >
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-8 w-28" />
        <Skeleton className="mx-auto h-4 w-64" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}
