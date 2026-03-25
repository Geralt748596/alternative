"use client";

import Image from "next/image";
import { ViewTransition } from "react";

interface PosterImageProps {
  articleId: string;
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  children?: React.ReactNode;
}

export function PosterImage({
  articleId,
  src,
  alt,
  sizes,
  priority,
  className,
  imageClassName = "object-cover",
  children,
}: PosterImageProps) {
  return (
    <ViewTransition name={`poster-${articleId}`}>
      <div className={className}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? "eager" : undefined}
          // decoding="sync"
          className={imageClassName}
        />
        {children}
      </div>
    </ViewTransition>
  );
}
