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
  /** Omitted until the page exists — renders muted and non-clickable. */
  href?: string;
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
      { label: 'Timesheets', icon: ClipboardList },
      { label: 'Activities', icon: Activity },
      { label: 'Material Handling', icon: Container },
    ],
  },
  {
    label: 'Approvals & Billing',
    items: [
      { label: 'Approvals', icon: Stamp },
      { label: 'Summary Timesheets', icon: FileStack },
      { label: 'Invoices', icon: Receipt },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { label: 'Companies', icon: Building2 },
      { label: 'Contracts', icon: FileSignature },
      { label: 'Services', icon: Wrench },
      { label: 'Periods', icon: CalendarRange },
      { label: 'Subcontractors', icon: Handshake },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Persons', icon: Users },
      { label: 'Accommodation', icon: BedDouble },
      { label: 'Meals', icon: UtensilsCrossed },
      { label: 'Positions & Users', icon: Network },
    ],
  },
  {
    label: 'Settings',
    items: [{ label: 'Reference Data', icon: Settings2 }],
  },
];

/** Resolves the current pathname to a nav label for the top bar. */
export function sectionTitle(pathname: string): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.href === pathname) return item.label;
    }
  }
  return 'Shorebase';
}
