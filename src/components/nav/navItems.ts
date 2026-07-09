import { NavIconName } from './navIcons';

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
}

export const navItems: NavItem[] = [
  { href: '/', label: 'Globe', icon: 'globe' },
  { href: '/timeline', label: 'Timeline', icon: 'timeline' },
  { href: '/gallery', label: 'Gallery', icon: 'gallery' },
  { href: '/about', label: 'About', icon: 'about' },
];
