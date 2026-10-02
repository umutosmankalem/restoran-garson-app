'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import {
  Bell,
  BellRing,
  Check,
  ChefHat,
  ChevronRight,
  Flame,
  Leaf,
  Loader2,
  Minus,
  PartyPopper,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  StickyNote,
  Trash2,
  UtensilsCrossed,
  WheatOff,
  X,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Supabase                                                                  */
/* -------------------------------------------------------------------------- */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

// Env anahtarları yoksa uygulama çökmesin; demo modunda yerel veriyle çalışır.
const DEMO_MODE = !SUPABASE_URL || !SUPABASE_KEY;

const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_KEY || 'placeholder-anon-key',
);

/* -------------------------------------------------------------------------- */
/*  Types & constants                                                         */
/* -------------------------------------------------------------------------- */

type PortionKey = 'single' | 'one_half' | 'double';
type OrderStatus = 'pending' | 'preparing' | 'completed' | (string & {});
type CallType = 'waiter' | 'bill';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  price_one_half: number | null;
  price_double: number | null;
  image_url: string | null;
  is_spicy: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
}

interface CartItem {
  key: string;
  product_id: string;
  name: string;
  portion: PortionKey;
  portion_label: string;
  price: number;
  quantity: number;
  note: string;
}

interface OrderItem {
  name: string;
  portion: string;
  quantity: number;
  price: number;
  note: string;
}

interface Order {
  id: string | number;
  status: OrderStatus;
  items: OrderItem[];
  total_amount: number;
  notes: string;
  table_number: string | number;
}

interface DietFilters {
  is_spicy: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
}

const COOLDOWN_SECONDS = 60;
const COMPLETION_DISPLAY_MS = 3500;
const ORDER_POLL_INTERVAL_MS = 8000;
const SEARCH_MIN_CHARS = 2;
const NOTE_PLACEHOLDER = 'Ürünle ilgili notunuzu buraya yazabilirsiniz';

const PORTION_LABELS: Record<PortionKey, string> = {
  single: 'Standart',
  one_half: '1.5 Porsiyon',
  double: 'Duble',
};

const DIET_OPTIONS: {
  key: keyof DietFilters;
  label: string;
  icon: typeof Flame;
  active: string;
}[] = [
  {
    key: 'is_spicy',
    label: 'Acılı',
    icon: Flame,
    active: 'border-red-500 bg-red-500 text-white',
  },
  {
    key: 'is_vegan',
    label: 'Vejetaryen',
    icon: Leaf,
    active: 'border-emerald-600 bg-emerald-600 text-white',
  },
  {
    key: 'is_gluten_free',
    label: 'Glutensiz',
    icon: WheatOff,
    active: 'border-amber-500 bg-amber-500 text-white',
  },
];

const DEMO_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Başlangıçlar' },
  { id: 'c2', name: 'Ana Yemekler' },
  { id: 'c3', name: 'Izgaralar' },
  { id: 'c4', name: 'Tatlılar' },
  { id: 'c5', name: 'İçecekler' },
];

const demoProduct = (
  id: string,
  category_id: string,
  name: string,
  description: string,
  price: number,
  extra: Partial<Product> = {},
): Product => ({
  id,
  category_id,
  name,
  description,
  price,
  price_one_half: null,
  price_double: null,
  image_url: null,
  is_spicy: false,
  is_vegan: false,
  is_gluten_free: false,
  ...extra,
});

const DEMO_PRODUCTS: Product[] = [
  demoProduct('p1', 'c1', 'Mercimek Çorbası', 'Süzme kırmızı mercimek, tereyağlı nane sosu ve limon ile.', 95, {
    is_vegan: true,
    is_gluten_free: true,
  }),
  demoProduct('p2', 'c1', 'Acılı Ezme', 'Domates, biber ve soğanla hazırlanan közlenmiş acılı ezme.', 85, {
    is_spicy: true,
    is_vegan: true,
  }),
  demoProduct('p3', 'c1', 'Sigara Böreği', 'Çıtır yufka içinde beyaz peynir ve maydanoz, 6 adet.', 140),
  demoProduct('p4', 'c2', 'Mantı', 'El açması hamur, dana kıyma, sarımsaklı yoğurt ve pul biber yağı.', 260, {
    price_one_half: 360,
    price_double: 480,
  }),
  demoProduct('p5', 'c2', 'Sebzeli Güveç', 'Fırında pişmiş mevsim sebzeleri, zeytinyağı ve taze otlar.', 220, {
    is_vegan: true,
    is_gluten_free: true,
  }),
  demoProduct('p6', 'c3', 'Adana Kebap', 'Acılı el kıyması, közlenmiş biber ve domates, lavaş ile.', 340, {
    is_spicy: true,
    price_one_half: 480,
    price_double: 620,
  }),
  demoProduct('p7', 'c3', 'Tavuk Şiş', 'Özel marinasyonlu tavuk but, pilav ve közlenmiş sebze ile.', 290, {
    is_gluten_free: true,
    price_one_half: 410,
    price_double: 540,
  }),
  demoProduct('p8', 'c4', 'Fıstıklı Baklava', 'Antep fıstığı, ince açılmış yufka ve sade kaymak, 4 dilim.', 210),
  demoProduct('p9', 'c4', 'Sütlaç', 'Fırınlanmış, bol sütlü geleneksel sütlaç.', 130, {
    is_gluten_free: true,
  }),
  demoProduct('p10', 'c5', 'Ayran', 'Bol köpüklü, soğuk servis.', 40, { is_vegan: false }),
  demoProduct('p11', 'c5', 'Türk Kahvesi', 'Közde pişirilmiş, lokum eşliğinde.', 75, {
    is_vegan: true,
    is_gluten_free: true,
  }),
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const formatPrice = (value: number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

const currentTime = () => Date.now();

const normalizeText = (value: string) => value.toLocaleLowerCase('tr-TR');

const readStorage = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* depolama dolu ya da kapalı olabilir */
  }
};

const removeStorage = (key: string) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* yoksay */
  }
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const mapProduct = (row: Record<string, unknown>): Product => ({
  id: String(row.id),
  category_id: String(row.category_id ?? ''),
  name: String(row.name ?? ''),
  description: String(row.description ?? ''),
  price: Number(row.price ?? 0),
  price_one_half: toNumberOrNull(row.price_one_half),
  price_double: toNumberOrNull(row.price_double),
  image_url: row.image_url ? String(row.image_url) : null,
  is_spicy: Boolean(row.is_spicy),
  is_vegan: Boolean(row.is_vegan),
  is_gluten_free: Boolean(row.is_gluten_free),
});

const mapOrder = (row: Record<string, unknown>): Order => {
  let rawItems: unknown = row.items;
  if (typeof rawItems === 'string') {
    try {
      rawItems = JSON.parse(rawItems);
    } catch {
      rawItems = [];
    }
  }
  const items: OrderItem[] = Array.isArray(rawItems)
    ? rawItems.map((item: Record<string, unknown>) => ({
        name: String(item.name ?? ''),
        portion: String(item.portion ?? PORTION_LABELS.single),
        quantity: Number(item.quantity ?? 1),
        price: Number(item.price ?? 0),
        note: String(item.note ?? ''),
      }))
    : [];
  return {
    id: row.id as string | number,
    status: String(row.status ?? 'pending').toLowerCase(),
    items,
    total_amount: Number(row.total_amount ?? 0),
    notes: String(row.notes ?? ''),
    table_number: (row.table_number as string | number) ?? '',
  };
};

const hasMultiplePortions = (product: Product) =>
  product.price_one_half !== null || product.price_double !== null;

const portionPrice = (product: Product, portion: PortionKey): number => {
  if (portion === 'one_half') return product.price_one_half ?? product.price;
  if (portion === 'double') return product.price_double ?? product.price;
  return product.price;
};

const availablePortions = (product: Product): PortionKey[] => {
  const list: PortionKey[] = ['single'];
  if (product.price_one_half !== null) list.push('one_half');
  if (product.price_double !== null) list.push('double');
  return list;
};

const buildCartKey = (productId: string, portion: PortionKey, note: string) =>
  `${productId}__${portion}__${note.trim().toLocaleLowerCase('tr-TR')}`;

const isCartItem = (value: unknown): value is CartItem => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.key === 'string' &&
    typeof v.product_id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.price === 'number' &&
    typeof v.quantity === 'number'
  );
};

/* -------------------------------------------------------------------------- */
/*  UI building blocks                                                        */
/* -------------------------------------------------------------------------- */

function Modal({
  onClose,
  title,
  children,
  footer,
  labelledBy,
}: {
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  labelledBy: string;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-[2px]"
      />
      <div className="relative flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <h2 id={labelledBy} className="text-lg font-bold text-stone-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition hover:bg-stone-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <div className="border-t border-stone-100 bg-white px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

function QuantityStepper({
  value,
  onDecrease,
  onIncrease,
  size = 'md',
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  size?: 'sm' | 'md';
}) {
  const button = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return (
    <div className="flex items-center gap-1 rounded-full bg-stone-100 p-1">
      <button
        type="button"
        onClick={onDecrease}
        aria-label="Azalt"
        className={`${button} flex items-center justify-center rounded-full bg-white text-stone-700 shadow-sm transition active:scale-95`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-8 text-center text-sm font-bold tabular-nums text-stone-900">{value}</span>
      <button
        type="button"
        onClick={onIncrease}
        aria-label="Artır"
        className={`${button} flex items-center justify-center rounded-full bg-orange-500 text-white shadow-sm transition active:scale-95`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function DietBadges({ product }: { product: Product }) {
  if (!product.is_spicy && !product.is_vegan && !product.is_gluten_free) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {product.is_spicy && (
        <span title="Acılı" className="flex h-5 w-5 items-center justify-center rounded-full bg-red-50 text-red-500">
          <Flame className="h-3 w-3" />
        </span>
      )}
      {product.is_vegan && (
        <span title="Vejetaryen" className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Leaf className="h-3 w-3" />
        </span>
      )}
      {product.is_gluten_free && (
        <span title="Glutensiz" className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <WheatOff className="h-3 w-3" />
        </span>
      )}
    </span>
  );
}

function ProductThumb({ product, className }: { product: Product; className: string }) {
  const [failed, setFailed] = useState(false);
  if (product.image_url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.image_url}
        alt={product.name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${className} object-cover`}
      />
    );
  }
  return (
    <div
      className={`${className} flex items-center justify-center bg-linear-to-br from-orange-100 to-amber-50 text-orange-400`}
    >
      <UtensilsCrossed className="h-7 w-7" />
    </div>
  );
}

function StepCircle({ state, icon }: { state: 'done' | 'active' | 'waiting'; icon: ReactNode }) {
  if (state === 'done') {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
        <Check className="h-5 w-5" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span className="flex h-10 w-10 shrink-0 animate-pulse items-center justify-center rounded-full border-4 border-orange-500 bg-orange-50 text-orange-600">
        {icon}
      </span>
    );
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-stone-300 bg-white text-stone-300">
      {icon}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main app                                                                  */
/* -------------------------------------------------------------------------- */

function MenuApp() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('masa') || searchParams.get('table') || '1';

  const cartKey = `cart_table_${tableParam}`;
  const activeOrderKey = `active_order_id_table_${tableParam}`;
  const waiterCooldownKey = `cooldown_waiter_${tableParam}`;
  const billCooldownKey = `cooldown_bill_${tableParam}`;

  /* Menu data */
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  /* Filters */
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [diet, setDiet] = useState<DietFilters>({ is_spicy: false, is_vegan: false, is_gluten_free: false });
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  /* Cart */
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoadedFor, setCartLoadedFor] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* Product detail modal */
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailPortion, setDetailPortion] = useState<PortionKey>('single');
  const [detailQty, setDetailQty] = useState(1);
  const [detailNote, setDetailNote] = useState('');

  /* Active order tracking */
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const demoTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* Cooldowns */
  const [cooldownUntil, setCooldownUntil] = useState<Record<CallType, number>>({ waiter: 0, bill: 0 });
  const [now, setNow] = useState(0);
  const [callPending, setCallPending] = useState<CallType | null>(null);

  /* Toast */
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ----------------------------- Menu loading ----------------------------- */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setMenuLoading(true);
      setMenuError(null);

      if (DEMO_MODE) {
        setCategories(DEMO_CATEGORIES);
        setProducts(DEMO_PRODUCTS);
        setMenuLoading(false);
        return;
      }

      const [categoriesRes, productsRes] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('products').select('*'),
      ]);
      if (cancelled) return;

      if (categoriesRes.error || productsRes.error) {
        setMenuError('Menü yüklenemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.');
        setMenuLoading(false);
        return;
      }

      const loadedCategories = ((categoriesRes.data ?? []) as Record<string, unknown>[])
        .sort((a, b) => Number(a.sort_order ?? a.id ?? 0) - Number(b.sort_order ?? b.id ?? 0))
        .map((row) => ({ id: String(row.id), name: String(row.name ?? '') }));

      const loadedProducts = ((productsRes.data ?? []) as Record<string, unknown>[])
        .filter((row) => row.is_available !== false && row.is_active !== false)
        .map(mapProduct);

      setCategories(loadedCategories);
      setProducts(loadedProducts);
      setMenuLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  /* ------------------------- Cart persistence ------------------------- */

  useEffect(() => {
    let stored: CartItem[] = [];
    const raw = readStorage(cartKey);
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) stored = parsed.filter(isCartItem);
      } catch {
        stored = [];
      }
    }
    // localStorage yalnızca istemcide okunabilir; hydration sonrası senkronize ediyoruz.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(stored);
    setCartLoadedFor(cartKey);
  }, [cartKey]);

  useEffect(() => {
    if (cartLoadedFor !== cartKey) return;
    if (cart.length === 0) removeStorage(cartKey);
    else writeStorage(cartKey, JSON.stringify(cart));
  }, [cart, cartKey, cartLoadedFor]);

  /* ---------------------- Active order restoration ---------------------- */

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      if (DEMO_MODE) {
        removeStorage(activeOrderKey);
        return;
      }

      let order: Order | null = null;
      const storedId = readStorage(activeOrderKey);

      if (storedId) {
        const { data } = await supabase.from('orders').select('*').eq('id', storedId).maybeSingle();
        if (data) order = mapOrder(data as Record<string, unknown>);
      }

      if (!order || order.status === 'completed') {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('table_number', tableParam)
          .in('status', ['pending', 'preparing'])
          .order('created_at', { ascending: false })
          .limit(1);
        order = data && data.length > 0 ? mapOrder(data[0] as Record<string, unknown>) : null;
      }

      if (cancelled) return;

      if (order && (order.status === 'pending' || order.status === 'preparing')) {
        writeStorage(activeOrderKey, String(order.id));
        setActiveOrder(order);
      } else {
        removeStorage(activeOrderKey);
        setActiveOrder(null);
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, [activeOrderKey, tableParam]);

  /* --------------- Realtime listener + polling safety net --------------- */

  const trackedOrderId = activeOrder ? String(activeOrder.id) : null;
  const trackedOrderDone = activeOrder?.status === 'completed';

  useEffect(() => {
    if (DEMO_MODE || !trackedOrderId || trackedOrderDone) return;

    const applyStatus = (row: Record<string, unknown>) => {
      const next = String(row.status ?? '').toLowerCase();
      if (!next) return;
      if (next === 'cancelled' || next === 'canceled') {
        removeStorage(activeOrderKey);
        setActiveOrder(null);
        setTrackingOpen(false);
        showToast('Siparişiniz iptal edildi.', 'error');
        return;
      }
      setActiveOrder((prev) =>
        prev && String(prev.id) === trackedOrderId && prev.status !== next ? { ...prev, status: next } : prev,
      );
    };

    const channel = supabase
      .channel(`orders-table-${tableParam}-${trackedOrderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${trackedOrderId}` },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'status' in payload.new) {
            applyStatus(payload.new as Record<string, unknown>);
          }
        },
      )
      .subscribe();

    const poll = setInterval(async () => {
      const { data } = await supabase.from('orders').select('status').eq('id', trackedOrderId).maybeSingle();
      if (data) applyStatus(data as Record<string, unknown>);
    }, ORDER_POLL_INTERVAL_MS);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [trackedOrderId, trackedOrderDone, tableParam, activeOrderKey, showToast]);

  /* -------------------- Completion: celebrate, then clear -------------------- */

  useEffect(() => {
    if (!trackedOrderDone) return;
    const timer = setTimeout(() => {
      removeStorage(activeOrderKey);
      setActiveOrder(null);
      setTrackingOpen(false);
    }, COMPLETION_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [trackedOrderDone, activeOrderKey]);

  useEffect(() => {
    const timers = demoTimersRef.current;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  /* ----------------------------- Cooldowns ----------------------------- */

  useEffect(() => {
    const read = (key: string) => {
      const value = Number(readStorage(key));
      return Number.isFinite(value) ? value : 0;
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCooldownUntil({ waiter: read(waiterCooldownKey), bill: read(billCooldownKey) });
    setNow(currentTime());
  }, [waiterCooldownKey, billCooldownKey]);

  const cooldownActive = cooldownUntil.waiter > now || cooldownUntil.bill > now;

  useEffect(() => {
    if (!cooldownActive) return;
    const timer = setInterval(() => setNow(currentTime()), 1000);
    return () => clearInterval(timer);
  }, [cooldownActive]);

  const remainingSeconds = (type: CallType) => Math.max(0, Math.ceil((cooldownUntil[type] - now) / 1000));
  const waiterRemaining = remainingSeconds('waiter');
  const billRemaining = remainingSeconds('bill');

  const handleCall = async (type: CallType) => {
    if (callPending || remainingSeconds(type) > 0) return;
    setCallPending(type);

    let failed = false;
    if (!DEMO_MODE) {
      const { error } = await supabase.from('table_calls').insert({
        table_number: tableParam,
        call_type: type,
        status: 'pending',
      });
      failed = Boolean(error);
    }

    setCallPending(null);

    if (failed) {
      showToast('İstek gönderilemedi. Lütfen tekrar deneyin.', 'error');
      return;
    }

    const until = currentTime() + COOLDOWN_SECONDS * 1000;
    writeStorage(type === 'waiter' ? waiterCooldownKey : billCooldownKey, String(until));
    setCooldownUntil((prev) => ({ ...prev, [type]: until }));
    setNow(currentTime());
    showToast(type === 'waiter' ? 'Garson çağrınız iletildi.' : 'Hesap isteğiniz iletildi.');
  };

  /* --------------------- Search popover outside click --------------------- */

  useEffect(() => {
    if (!searchOpen) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [searchOpen]);

  /* ----------------------------- Body scroll lock ----------------------------- */

  const anyModalOpen = cartOpen || trackingOpen || detailProduct !== null;

  useEffect(() => {
    if (!anyModalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [anyModalOpen]);

  /* ------------------------------ Derived data ------------------------------ */

  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeText(trimmedQuery);

  const searchSuggestions = useMemo(() => {
    if (trimmedQuery.length < SEARCH_MIN_CHARS) return [];
    return products
      .filter(
        (p) =>
          normalizeText(p.name).includes(normalizedQuery) || normalizeText(p.description).includes(normalizedQuery),
      )
      .slice(0, 6);
  }, [products, trimmedQuery, normalizedQuery]);

  const categoryName = useCallback(
    (id: string) => categories.find((c) => c.id === id)?.name ?? '',
    [categories],
  );

  const visibleProducts = useMemo(
    () =>
      products.filter((p) => {
        if (activeCategory !== 'all' && p.category_id !== activeCategory) return false;
        if (diet.is_spicy && !p.is_spicy) return false;
        if (diet.is_vegan && !p.is_vegan) return false;
        if (diet.is_gluten_free && !p.is_gluten_free) return false;
        if (trimmedQuery) {
          const haystack = `${normalizeText(p.name)} ${normalizeText(p.description)}`;
          if (!haystack.includes(normalizedQuery)) return false;
        }
        return true;
      }),
    [products, activeCategory, diet, trimmedQuery, normalizedQuery],
  );

  const groupedProducts = useMemo(() => {
    const groups: { category: Category; items: Product[] }[] = [];
    const known = new Set(categories.map((c) => c.id));
    categories.forEach((category) => {
      const items = visibleProducts.filter((p) => p.category_id === category.id);
      if (items.length > 0) groups.push({ category, items });
    });
    const orphans = visibleProducts.filter((p) => !known.has(p.category_id));
    if (orphans.length > 0) groups.push({ category: { id: 'other', name: 'Diğer' }, items: orphans });
    return groups;
  }, [categories, visibleProducts]);

  const hasActiveFilters =
    activeCategory !== 'all' || diet.is_spicy || diet.is_vegan || diet.is_gluten_free || trimmedQuery !== '';

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const detailUnitPrice = detailProduct ? portionPrice(detailProduct, detailPortion) : 0;

  /* ------------------------------ Cart actions ------------------------------ */

  const addToCart = useCallback(
    (product: Product, portion: PortionKey, quantity: number, note: string) => {
      const cleanNote = note.trim();
      const key = buildCartKey(product.id, portion, cleanNote);
      setCart((prev) => {
        const existing = prev.find((item) => item.key === key);
        if (existing) {
          return prev.map((item) => (item.key === key ? { ...item, quantity: item.quantity + quantity } : item));
        }
        return [
          ...prev,
          {
            key,
            product_id: product.id,
            name: product.name,
            portion,
            portion_label: PORTION_LABELS[portion],
            price: portionPrice(product, portion),
            quantity,
            note: cleanNote,
          },
        ];
      });
    },
    [],
  );

  const changeQuantity = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.key === key ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (key: string) => setCart((prev) => prev.filter((item) => item.key !== key));

  const openProduct = (product: Product) => {
    setDetailProduct(product);
    setDetailPortion('single');
    setDetailQty(1);
    setDetailNote('');
  };

  const handleProductTap = (product: Product) => {
    if (hasMultiplePortions(product)) {
      openProduct(product);
      return;
    }
    addToCart(product, 'single', 1, '');
    showToast(`${product.name} sepete eklendi.`);
  };

  const confirmDetail = () => {
    if (!detailProduct) return;
    addToCart(detailProduct, detailPortion, detailQty, detailNote);
    showToast(`${detailProduct.name} sepete eklendi.`);
    setDetailProduct(null);
  };

  const pickSuggestion = (product: Product) => {
    setQuery(product.name);
    setActiveCategory('all');
    setSearchOpen(false);
  };

  const clearFilters = () => {
    setActiveCategory('all');
    setDiet({ is_spicy: false, is_vegan: false, is_gluten_free: false });
    setQuery('');
    setSearchOpen(false);
  };

  /* ------------------------------ Order submit ------------------------------ */

  const startDemoProgress = (orderId: string) => {
    const advance = (status: OrderStatus, delay: number) =>
      setTimeout(() => {
        setActiveOrder((prev) => (prev && String(prev.id) === orderId ? { ...prev, status } : prev));
      }, delay);
    demoTimersRef.current.forEach(clearTimeout);
    demoTimersRef.current = [advance('preparing', 5000), advance('completed', 13000)];
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);

    const items: OrderItem[] = cart.map((item) => ({
      name: item.name,
      portion: item.portion_label,
      quantity: item.quantity,
      price: item.price,
      note: item.note,
    }));
    const notes = orderNote.trim();

    let created: Order | null = null;

    if (DEMO_MODE) {
      const demoId = `demo-${currentTime()}`;
      created = { id: demoId, status: 'pending', items, total_amount: cartTotal, notes, table_number: tableParam };
      startDemoProgress(demoId);
    } else {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          items,
          table_number: tableParam,
          total_amount: cartTotal,
          notes,
          status: 'pending',
        })
        .select()
        .single();

      if (error || !data) {
        setSubmitting(false);
        showToast('Sipariş gönderilemedi. Lütfen tekrar deneyin.', 'error');
        return;
      }
      created = mapOrder(data as Record<string, unknown>);
      created = { ...created, items, total_amount: cartTotal, notes };
    }

    writeStorage(activeOrderKey, String(created.id));
    setActiveOrder(created);
    setCart([]);
    setOrderNote('');
    setCartOpen(false);
    setTrackingOpen(true);
    setSubmitting(false);
  };

  /* --------------------------- Stepper state mapping --------------------------- */

  const orderStatus = activeOrder?.status ?? 'pending';
  const isPreparing = orderStatus === 'preparing';
  const isCompleted = orderStatus === 'completed';

  const barText = isCompleted
    ? 'Siparişiniz hazırlandı, afiyet olsun!'
    : isPreparing
      ? 'Siparişiniz hazırlanıyor'
      : 'Siparişiniz alındı';

  /* --------------------------------- Render --------------------------------- */

  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl pb-32">
      {/* Aktif sipariş takip çubuğu */}
      {activeOrder && (
        <button
          type="button"
          onClick={() => setTrackingOpen(true)}
          className="sticky top-0 z-40 flex w-full items-center gap-3 bg-orange-500 px-4 py-3 text-left text-white shadow-md transition hover:bg-orange-600"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
            {isCompleted ? (
              <PartyPopper className="h-4 w-4" />
            ) : isPreparing ? (
              <ChefHat className="h-4 w-4 animate-pulse" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{barText}</span>
            <span className="block text-xs text-white/80">
              {isCompleted ? 'Masanıza ulaştı' : 'Canlı takip için dokunun'}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0" />
        </button>
      )}

      {/* Başlık */}
      <header className="px-4 pb-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">Hoş geldiniz</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900">Dijital Menü</h1>
          </div>
          <span className="rounded-full bg-stone-900 px-3.5 py-1.5 text-sm font-bold text-white">
            Masa {tableParam}
          </span>
        </div>

        {DEMO_MODE && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
            Demo modu: Supabase anahtarları tanımlı değil, örnek menü ve simüle edilmiş sipariş akışı gösteriliyor.
          </p>
        )}

        {/* Garson / Hesap */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(
            [
              { type: 'waiter' as const, label: 'Garson Çağır', icon: Bell, remaining: waiterRemaining },
              { type: 'bill' as const, label: 'Hesap İste', icon: Receipt, remaining: billRemaining },
            ]
          ).map(({ type, label, icon: Icon, remaining }) => {
            const locked = remaining > 0;
            const pending = callPending === type;
            return (
              <button
                key={type}
                type="button"
                disabled={locked || callPending !== null}
                onClick={() => handleCall(type)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm font-semibold text-stone-800 shadow-sm transition enabled:hover:border-orange-300 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : locked ? (
                  <BellRing className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4 text-orange-500" />
                )}
                {locked ? (
                  <span className="tabular-nums">{remaining}s</span>
                ) : (
                  label
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Arama */}
      <div className="px-4">
        <div ref={searchBoxRef} className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Lezzet ara..."
            aria-label="Menüde ara"
            className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-10 pr-10 text-[16px] text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 sm:text-sm"
          />
          {query && (
            <button
              type="button"
              aria-label="Aramayı temizle"
              onClick={() => {
                setQuery('');
                setSearchOpen(false);
              }}
              className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {searchOpen && trimmedQuery.length >= SEARCH_MIN_CHARS && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xl">
              {searchSuggestions.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-stone-500">
                  &ldquo;{trimmedQuery}&rdquo; için eşleşen lezzet bulunamadı.
                </p>
              ) : (
                searchSuggestions.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => pickSuggestion(product)}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-orange-50"
                  >
                    <ProductThumb product={product} className="h-10 w-10 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-stone-900">{product.name}</span>
                      <span className="block truncate text-xs text-stone-500">{categoryName(product.category_id)}</span>
                    </span>
                    <span className="text-sm font-bold text-orange-600">{formatPrice(product.price)}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Diyet filtreleri */}
        <div className="mt-3 flex flex-wrap gap-2">
          {DIET_OPTIONS.map(({ key, label, icon: Icon, active }) => {
            const on = diet[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => setDiet((prev) => ({ ...prev, [key]: !prev[key] }))}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  on ? active : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Kategoriler */}
      <nav
        aria-label="Kategoriler"
        className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {[{ id: 'all', name: 'Tümü' }, ...categories].map((category) => {
          const selected = activeCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                selected
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:ring-orange-300'
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </nav>

      {/* Ürün listesi */}
      <main className="mt-5 px-4">
        {menuLoading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse gap-3 rounded-2xl bg-white p-3 ring-1 ring-stone-100">
                <div className="h-24 w-24 rounded-xl bg-stone-100" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-2/3 rounded bg-stone-100" />
                  <div className="h-3 w-full rounded bg-stone-100" />
                  <div className="h-3 w-1/2 rounded bg-stone-100" />
                </div>
              </div>
            ))}
          </div>
        ) : menuError ? (
          <div className="rounded-2xl bg-red-50 p-6 text-center ring-1 ring-red-100">
            <p className="text-sm font-medium text-red-700">{menuError}</p>
            <button
              type="button"
              onClick={() => setReloadToken((n) => n + 1)}
              className="mt-3 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Tekrar dene
            </button>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-stone-200">
            <UtensilsCrossed className="mx-auto h-8 w-8 text-stone-300" />
            <p className="mt-3 text-sm font-semibold text-stone-700">
              {products.length === 0 ? 'Menüde henüz ürün yok.' : 'Aramanıza uygun ürün bulunamadı.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Filtreleri temizle
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-7">
            {groupedProducts.map(({ category, items }) => (
              <section key={category.id} aria-labelledby={`cat-${category.id}`}>
                <h2 id={`cat-${category.id}`} className="mb-3 text-lg font-bold text-stone-900">
                  {category.name}
                </h2>
                <ul className="space-y-3">
                  {items.map((product) => {
                    const multi = hasMultiplePortions(product);
                    return (
                      <li
                        key={product.id}
                        className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200/70"
                      >
                        <button
                          type="button"
                          onClick={() => multi && openProduct(product)}
                          disabled={!multi}
                          aria-label={multi ? `${product.name} detayları` : undefined}
                          className="shrink-0 disabled:cursor-default"
                        >
                          <ProductThumb product={product} className="h-24 w-24 rounded-xl" />
                        </button>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-[15px] font-bold leading-snug text-stone-900">{product.name}</h3>
                            <DietBadges product={product} />
                          </div>
                          {product.description && (
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-500">
                              {product.description}
                            </p>
                          )}
                          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                            <div>
                              <span className="text-base font-extrabold text-stone-900">
                                {formatPrice(product.price)}
                              </span>
                              {multi && (
                                <span className="ml-1.5 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                                  Porsiyon seçenekleri
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleProductTap(product)}
                              aria-label={multi ? `${product.name} porsiyon seç` : `${product.name} sepete ekle`}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-md shadow-orange-200 transition hover:bg-orange-600 active:scale-95"
                            >
                              <Plus className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Sepet çubuğu */}
      {cartCount > 0 && !anyModalOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="mx-auto flex w-full max-w-2xl items-center gap-3 rounded-2xl bg-stone-900 px-4 py-3.5 text-white shadow-2xl transition active:scale-[0.99]"
          >
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold">
                {cartCount}
              </span>
            </span>
            <span className="flex-1 text-left text-sm font-semibold">Sepeti Görüntüle</span>
            <span className="text-base font-extrabold">{formatPrice(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed left-1/2 top-4 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl px-4 py-3 text-center text-sm font-semibold text-white shadow-xl ${
            toast.tone === 'error' ? 'bg-red-600' : 'bg-stone-900'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Ürün detay modalı */}
      {detailProduct && (
        <Modal
          onClose={() => setDetailProduct(null)}
          title={detailProduct.name}
          labelledBy="detail-title"
          footer={
            <div className="flex items-center gap-3">
              <QuantityStepper
                value={detailQty}
                onDecrease={() => setDetailQty((q) => Math.max(1, q - 1))}
                onIncrease={() => setDetailQty((q) => Math.min(99, q + 1))}
              />
              <button
                type="button"
                onClick={confirmDetail}
                className="flex-1 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600 active:scale-[0.98]"
              >
                Sepete Ekle · {formatPrice(detailUnitPrice * detailQty)}
              </button>
            </div>
          }
        >
          <ProductThumb product={detailProduct} className="h-40 w-full rounded-2xl" />
          <div className="mt-3 flex items-center justify-between gap-2">
            <DietBadges product={detailProduct} />
          </div>
          {detailProduct.description && (
            <p className="mt-2 text-sm leading-relaxed text-stone-600">{detailProduct.description}</p>
          )}

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-bold text-stone-900">Porsiyon seçin</legend>
            <div className="space-y-2">
              {availablePortions(detailProduct).map((portion) => {
                const selected = detailPortion === portion;
                return (
                  <label
                    key={portion}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                      selected
                        ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="portion"
                        value={portion}
                        checked={selected}
                        onChange={() => setDetailPortion(portion)}
                        className="h-4 w-4 accent-orange-500"
                      />
                      <span className="text-sm font-semibold text-stone-800">{PORTION_LABELS[portion]}</span>
                    </span>
                    <span className="text-sm font-bold text-stone-900">
                      {formatPrice(portionPrice(detailProduct, portion))}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5">
            <label htmlFor="detail-note" className="mb-2 flex items-center gap-1.5 text-sm font-bold text-stone-900">
              <StickyNote className="h-4 w-4 text-orange-500" />
              Ürün notu
            </label>
            <input
              id="detail-note"
              type="text"
              value={detailNote}
              onChange={(event) => setDetailNote(event.target.value)}
              placeholder={NOTE_PLACEHOLDER}
              maxLength={200}
              className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-[16px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 sm:text-xs"
            />
          </div>
        </Modal>
      )}

      {/* Sepet modalı */}
      {cartOpen && (
        <Modal
          onClose={() => setCartOpen(false)}
          title="Sepetim"
          labelledBy="cart-title"
          footer={
            cart.length > 0 ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-500">Toplam</span>
                  <span className="text-xl font-extrabold text-stone-900">{formatPrice(cartTotal)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-orange-200 transition enabled:hover:bg-orange-600 enabled:active:scale-[0.98] disabled:opacity-70"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? 'Gönderiliyor...' : 'Siparişi Onayla'}
                </button>
              </div>
            ) : undefined
          }
        >
          {cart.length === 0 ? (
            <div className="py-10 text-center">
              <ShoppingBag className="mx-auto h-9 w-9 text-stone-300" />
              <p className="mt-3 text-sm font-semibold text-stone-600">Sepetiniz boş.</p>
              <p className="mt-1 text-xs text-stone-400">Menüden lezzet ekleyerek başlayın.</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-stone-100">
                {cart.map((item) => (
                  <li key={item.key} className="py-3 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-stone-900">{item.name}</p>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {item.portion_label} · {formatPrice(item.price)}
                        </p>
                        {item.note && (
                          <p className="mt-1 text-xs italic text-orange-700">Not: {item.note}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.key)}
                        aria-label={`${item.name} ürününü sil`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        onDecrease={() => changeQuantity(item.key, -1)}
                        onIncrease={() => changeQuantity(item.key, 1)}
                      />
                      <span className="text-sm font-bold text-stone-900">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                <label htmlFor="order-note" className="mb-2 flex items-center gap-1.5 text-sm font-bold text-stone-900">
                  <StickyNote className="h-4 w-4 text-orange-500" />
                  Mutfağa not
                </label>
                <textarea
                  id="order-note"
                  value={orderNote}
                  onChange={(event) => setOrderNote(event.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="Siparişin geneli için mutfağa iletmek istediğiniz not"
                  className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-[16px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 sm:text-xs"
                />
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Sipariş takip modalı */}
      {trackingOpen && activeOrder && (
        <Modal onClose={() => setTrackingOpen(false)} title="Sipariş Durumu" labelledBy="tracking-title">
          {isCompleted && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
              <PartyPopper className="h-6 w-6 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-emerald-800">Afiyet olsun!</p>
                <p className="text-xs text-emerald-700">Siparişiniz hazırlandı ve masanıza ulaştı.</p>
              </div>
            </div>
          )}

          <ol className="relative">
            {[
              {
                title: 'Siparişiniz Alındı',
                subtitle: 'Siparişiniz mutfağa iletildi.',
                state: 'done' as const,
                icon: <Check className="h-5 w-5" />,
              },
              {
                title: isCompleted ? 'Hazırlandı' : 'Hazırlanıyor',
                subtitle: isCompleted
                  ? 'Yemekleriniz hazır.'
                  : isPreparing
                    ? 'Şefimiz siparişinizi hazırlıyor.'
                    : 'Mutfak onayı bekleniyor.',
                state: isCompleted ? ('done' as const) : isPreparing ? ('active' as const) : ('waiting' as const),
                icon: <ChefHat className="h-5 w-5" />,
              },
              {
                title: 'Masanıza Ulaştı',
                subtitle: isCompleted ? 'Afiyet olsun!' : 'Hazır olduğunda masanıza getirilecek.',
                state: isCompleted ? ('done' as const) : ('waiting' as const),
                icon: <UtensilsCrossed className="h-5 w-5" />,
              },
            ].map((step, index, steps) => (
              <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                {index < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-5 top-10 -ml-px h-[calc(100%-2.5rem)] w-0.5 ${
                      steps[index + 1].state === 'waiting' ? 'bg-stone-200' : 'bg-emerald-600'
                    }`}
                  />
                )}
                <StepCircle state={step.state} icon={step.icon} />
                <div className="pt-1">
                  <p
                    className={`text-sm font-bold ${
                      step.state === 'waiting'
                        ? 'text-stone-400'
                        : step.state === 'active'
                          ? 'text-orange-600'
                          : 'text-stone-900'
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-stone-500">{step.subtitle}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">Sipariş Özeti</h3>
              <span className="text-xs font-semibold text-stone-500">Masa {tableParam}</span>
            </div>
            <ul className="space-y-3">
              {activeOrder.items.map((item, index) => (
                <li key={`${item.name}-${item.portion}-${index}`} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-900">
                      {item.quantity}x {item.name}
                    </p>
                    <p className="text-xs text-stone-500">{item.portion}</p>
                    {item.note && <p className="mt-0.5 text-xs italic text-orange-700">Not: {item.note}</p>}
                  </div>
                  <span className="shrink-0 text-sm font-bold text-stone-900">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            {activeOrder.notes && (
              <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800">
                <span className="font-bold">Mutfak notu:</span> {activeOrder.notes}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-3">
              <span className="text-sm font-semibold text-stone-500">Toplam</span>
              <span className="text-lg font-extrabold text-stone-900">{formatPrice(activeOrder.total_amount)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        </div>
      }
    >
      <MenuApp />
    </Suspense>
  );
}
