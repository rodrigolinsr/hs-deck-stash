import { Link } from "react-router-dom";

interface AppBrandProps {
  link?: boolean;
  className?: string;
}

export default function AppBrand({ link = false, className = "h-10" }: AppBrandProps) {
  const image = <img src="/HSDeckStash-logo.png" alt="HSDeckStash" className={`w-auto object-contain ${className}`} />;
  return link ? <Link to="/" className="inline-flex shrink-0" data-testid="app-logo-link">{image}</Link> : image;
}
