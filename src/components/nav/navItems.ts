export interface NavItem {
  href: string;
  label: string;
}

export const navItems: NavItem[] = [
  { href: '/', label: 'Globe' },
  { href: '/timeline', label: 'Timeline' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/about', label: 'About' },
];
