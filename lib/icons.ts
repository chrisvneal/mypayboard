import {
  Baby,
  Banknote,
  Car,
  CreditCard,
  Dog,
  Droplet,
  Dumbbell,
  Flame,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  Plane,
  PiggyBank,
  ReceiptText,
  Shield,
  ShoppingCart,
  Smartphone,
  Tv,
  Warehouse,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export type IconKey =
  | 'home' | 'education' | 'storage' | 'phone' | 'auto' | 'internet'
  | 'electric' | 'fitness' | 'streaming' | 'savings' | 'investment'
  | 'loan' | 'credit-card' | 'receipt' | 'insurance' | 'shopping'
  | 'water' | 'gas' | 'protection' | 'pet' | 'family' | 'travel'
  | 'maintenance' | 'gift'

export const ICON_MAP: Record<IconKey, { Icon: LucideIcon; label: string }> = {
  'home':        { Icon: Home,         label: 'Home' },
  'education':   { Icon: GraduationCap, label: 'Education' },
  'storage':     { Icon: Warehouse,    label: 'Storage' },
  'phone':       { Icon: Smartphone,   label: 'Phone' },
  'auto':        { Icon: Car,          label: 'Auto' },
  'internet':    { Icon: Wifi,         label: 'Internet' },
  'electric':    { Icon: Zap,          label: 'Electric' },
  'fitness':     { Icon: Dumbbell,     label: 'Fitness' },
  'streaming':   { Icon: Tv,           label: 'Streaming' },
  'savings':     { Icon: PiggyBank,    label: 'Savings' },
  'investment':  { Icon: Landmark,     label: 'Investment' },
  'loan':        { Icon: Banknote,     label: 'Loan' },
  'credit-card': { Icon: CreditCard,   label: 'Credit Card' },
  'receipt':     { Icon: ReceiptText,  label: 'General' },
  'insurance':   { Icon: Shield,       label: 'Insurance' },
  'shopping':    { Icon: ShoppingCart, label: 'Shopping' },
  'water':       { Icon: Droplet,      label: 'Water' },
  'gas':         { Icon: Flame,        label: 'Gas' },
  'protection':  { Icon: Heart,        label: 'Health' },
  'pet':         { Icon: Dog,          label: 'Pet' },
  'family':      { Icon: Baby,         label: 'Family' },
  'travel':      { Icon: Plane,        label: 'Travel' },
  'maintenance': { Icon: Wrench,       label: 'Maintenance' },
  'gift':        { Icon: Gift,         label: 'Gift' },
}

export const ICON_KEYS = Object.keys(ICON_MAP) as IconKey[]

export function categoryDefaultIcon(category: string): IconKey {
  const c = category.toLowerCase()
  if (c.includes('credit')) return 'credit-card'
  if (c.includes('subscription')) return 'streaming'
  if (c.includes('saving')) return 'savings'
  if (c.includes('benefit')) return 'protection'
  if (c.includes('job') || c.includes('employ') || c.includes('business')) return 'loan'
  return 'receipt'
}

export function resolveIcon(
  iconKey: string | undefined,
  category: string
): { key: IconKey; Icon: LucideIcon; label: string } {
  const key = (iconKey && iconKey in ICON_MAP ? iconKey : categoryDefaultIcon(category)) as IconKey
  return { key, ...ICON_MAP[key] }
}
