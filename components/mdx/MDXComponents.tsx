import Link from 'next/link';
import Image, { type ImageProps } from 'next/image';
import type { MDXComponents } from 'mdx/types';
import type { AnchorHTMLAttributes, ImgHTMLAttributes } from 'react';

function CustomLink({ href = '', ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (href.startsWith('/') || href.startsWith('#')) {
    return <Link href={href} {...props} />;
  }
  return <a href={href} target="_blank" rel="noopener" {...props} />;
}

function CustomImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  const { src, alt = '', width, height, ...rest } = props;
  if (typeof src !== 'string') return null;
  if (width && height) {
    return (
      <Image
        {...(rest as Omit<ImageProps, 'src' | 'alt' | 'width' | 'height'>)}
        src={src}
        alt={alt}
        width={Number(width)}
        height={Number(height)}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...rest} src={src} alt={alt} loading="lazy" decoding="async" />;
}

export const mdxComponents: MDXComponents = {
  a: CustomLink,
  img: CustomImage as MDXComponents['img'],
};
