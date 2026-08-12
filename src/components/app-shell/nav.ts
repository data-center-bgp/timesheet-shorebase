import {
  Activity,
  BedDouble,
  Building2,
  CalendarRange,
  ClipboardList,
  Container,
  FileSignature,
  FileStack,
  Handshake,
  LayoutDashboard,
  Network,
  Receipt,
  Settings2,
  Stamp,
  UtensilsCrossed,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  icon: LucideIcon;
  /**
   * Every item links somewhere. Pages that don't exist yet resolve to the
   * `[section]` catch-all, which renders a "Coming soon" placeholder — so
   * this list never needs to shrink or grow as real pages get built.
   */
  href: string;
};

export type NavGroup = {
  /** Shown as a tracked mono uppercase label above the group. */
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
      { label: 'Timesheets', icon: ClipboardList, href: '/timesheets' },
      { label: 'Activities', icon: Activity, href: '/activities' },
      { label: 'Material Handling', icon: Container, href: '/material-handling' },
    ],
  },
  {
    label: 'Approvals & Billing',
    items: [
      { label: 'Approvals', icon: Stamp, href: '/approvals' },
      { label: 'Summary Timesheets', icon: FileStack, href: '/summary-timesheets' },
      { label: 'Invoices', icon: Receipt, href: '/invoices' },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { label: 'Companies', icon: Building2, href: '/companies' },
      { label: 'Contracts', icon: FileSignature, href: '/contracts' },
      { label: 'Services', icon: Wrench, href: '/services' },
      { label: 'Periods', icon: CalendarRange, href: '/periods' },
      { label: 'Subcontractors', icon: Handshake, href: '/subcontractors' },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Persons', icon: Users, href: '/persons' },
      { label: 'Accommodation', icon: BedDouble, href: '/accommodation' },
      { label: 'Meals', icon: UtensilsCrossed, href: '/meals' },
      { label: 'Positions & Users', icon: Network, href: '/positions-users' },
    ],
  },
  {
    label: 'Settings',
    items: [{ label: 'Reference Data', icon: Settings2, href: '/reference-data' }],
  },
];

/** Flat lookup used by the [section] catch-all to validate a path and find its label. */
export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_GROUPS.flatMap((g) => g.items).find((item) => item.href === pathname);
}

/**
 * Whether a nav item's href should be considered active for the current
 * pathname — true for an exact match or any sub-route beneath it (e.g.
 * `/companies` is active for `/companies/new` and `/companies/2/edit`).
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

/** Resolves the current pathname to a nav label for the top bar. */
export function sectionTitle(pathname: string): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isNavItemActive(item.href, pathname)) return item.label;
    }
  }
  return 'Shorebase';
}
