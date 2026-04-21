import Link from 'next/link';
import { BrandMark } from './BrandMark';
import { SocialIcons } from './SocialIcons';
import { SITE } from '@/lib/site';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <Link href="/" className="nav-brand" aria-label={`Malaka Venu — home (${SITE.name})`}>
          <BrandMark gradId="lmf" />
          <span className="brand-text">
            Malaka<span className="grad">Venu</span>
          </span>
        </Link>

        <SocialIcons location="footer" />

        <p>&copy; {year} {SITE.name}. Crafted with care.</p>
      </div>
    </footer>
  );
}
