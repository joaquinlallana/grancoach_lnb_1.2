export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-3"
          style={{ width: `${100 - i * 12}%` }}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-5 sm:p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="skeleton h-12 w-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-2/3" />
          <div className="skeleton h-6 w-1/2" />
          <div className="skeleton h-2.5 w-1/3" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonRow({ cols = 4, className = '' }) {
  return (
    <div className={`flex items-center gap-4 py-3 ${className}`} aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="skeleton h-3 flex-1" />
      ))}
    </div>
  )
}
