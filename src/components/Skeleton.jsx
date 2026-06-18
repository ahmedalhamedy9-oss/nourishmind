import React from 'react';

// Base skeleton shimmer
const Skeleton = ({ className = '', style = {} }) => (
  <div
    className={`rounded-lg ${className}`}
    style={{
      background: 'linear-gradient(90deg, #1a2a28 25%, #243530 50%, #1a2a28 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...style,
    }}
  />
);

// Course Card Skeleton
export const CourseCardSkeleton = () => (
  <div className="flex-shrink-0 w-[280px] sm:w-[300px]">
    <Skeleton className="w-full aspect-video mb-3" />
    <div className="px-1">
      <Skeleton className="h-3 w-16 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-3/4 mb-3" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  </div>
);

// Course Row Skeleton
export const CourseRowSkeleton = () => (
  <div className="mb-10">
    <Skeleton className="h-6 w-48 mb-4 mx-4 sm:mx-12" />
    <div className="flex gap-4 px-4 sm:px-12 overflow-hidden">
      {[...Array(4)].map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Hero Skeleton
export const HeroSkeleton = () => (
  <div className="relative h-[92vh] min-h-[560px] bg-card flex items-center px-6 sm:px-16">
    <div className="max-w-2xl w-full">
      <Skeleton className="h-4 w-48 mb-6" />
      <Skeleton className="h-14 w-full mb-3" />
      <Skeleton className="h-14 w-4/5 mb-3" />
      <Skeleton className="h-14 w-3/5 mb-8" />
      <Skeleton className="h-5 w-full mb-2" />
      <Skeleton className="h-5 w-3/4 mb-8" />
      <div className="flex gap-4">
        <Skeleton className="h-12 w-40 rounded-xl" />
        <Skeleton className="h-12 w-40 rounded-xl" />
      </div>
    </div>
  </div>
);

export default Skeleton;
