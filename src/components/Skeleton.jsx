// Skeleton screen primitives — tutarlı loading state'leri
import React from 'react';

export const SkeletonLine = ({ width = '100%', height = 14, className = '' }) => (
  <div className={`skeleton-shimmer rounded ${className}`} style={{ width, height }} />
);

export const SkeletonCircle = ({ size = 40, className = '' }) => (
  <div className={`skeleton-shimmer rounded-full ${className}`} style={{ width: size, height: size }} />
);

export const SkeletonBox = ({ width = '100%', height = 80, className = '', radius = 12 }) => (
  <div className={`skeleton-shimmer ${className}`} style={{ width, height, borderRadius: radius }} />
);

// Hazır kompozisyonlar
export const SkeletonVideoKart = () => (
  <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
    <div className="aspect-video skeleton-shimmer" />
    <div className="p-2.5 space-y-2">
      <SkeletonLine height={12} width="90%" />
      <SkeletonLine height={10} width="60%" />
    </div>
  </div>
);

export const SkeletonUyeKart = () => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
    <div className="flex items-start gap-3">
      <SkeletonCircle size={20} />
      <SkeletonCircle size={48} />
      <div className="flex-1 space-y-2 mt-1">
        <SkeletonLine height={14} width="60%" />
        <SkeletonLine height={10} width="40%" />
        <div className="grid grid-cols-3 gap-2 mt-3">
          <SkeletonBox height={36} radius={8} />
          <SkeletonBox height={36} radius={8} />
          <SkeletonBox height={36} radius={8} />
        </div>
      </div>
    </div>
  </div>
);

export const SkeletonGrid = ({ count = 8 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
    {Array.from({ length: count }).map((_, i) => <SkeletonVideoKart key={i} />)}
  </div>
);

export const SkeletonList = ({ count = 5, Component = SkeletonUyeKart }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => <Component key={i} />)}
  </div>
);

export default { SkeletonLine, SkeletonCircle, SkeletonBox, SkeletonVideoKart, SkeletonUyeKart, SkeletonGrid, SkeletonList };
