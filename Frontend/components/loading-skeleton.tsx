import { Loader2 } from "lucide-react"

interface LoadingSkeletonProps {
  className?: string
  type?: 'card' | 'chart' | 'list' | 'nav' | 'spline'
}

export function LoadingSkeleton({ className = "", type = 'card' }: LoadingSkeletonProps) {
  if (type === 'spline') {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 ${className}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading 3D Experience...</p>
        </div>
      </div>
    )
  }

  if (type === 'chart') {
    return (
      <div className={`h-[300px] flex items-center justify-center ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (type === 'list') {
    return (
      <div className={`space-y-2 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'nav') {
    return (
      <div className={`w-[240px] border-r p-4 ${className}`}>
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Default card skeleton
  return (
    <div className={`space-y-2 ${className}`}>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-3 border rounded">
          <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-2 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}
