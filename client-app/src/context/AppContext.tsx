import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ScoutingOrder } from '../types';
import { STRATEGY_OPTIONS } from '../types';

const SELECTION_KEY = 'antberg_selection';
const ORDER_KEY = 'antberg_order_draft';

const defaultOrder: ScoutingOrder = {
  strategy: 'value_add',
  strategyLabel: 'Value Add',
  country: 'Germany',
  state: 'Baden-Württemberg',
  city: 'Stuttgart',
  radiusKm: 40,
  assetTypes: ['Mixed-Use', 'Residential'],
  ticketMin: 2_000_000,
  ticketMax: 10_000_000,
  signals: ['Energy pressure', 'Zoning upside', 'Underutilized land', 'Low rent vs market'],
  exclusions: [],
};

function loadSelection(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SELECTION_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function loadOrder(): ScoutingOrder {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    return raw ? { ...defaultOrder, ...JSON.parse(raw) } : defaultOrder;
  } catch {
    return defaultOrder;
  }
}

interface AppState {
  order: ScoutingOrder;
  setOrder: (patch: Partial<ScoutingOrder>) => void;
  selection: string[];
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  catalogCount: number;
  setCatalogCount: (n: number) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [order, setOrderState] = useState<ScoutingOrder>(loadOrder);
  const [selection, setSelection] = useState<string[]>(loadSelection);
  const [catalogCount, setCatalogCount] = useState(100);

  const setOrder = useCallback((patch: Partial<ScoutingOrder>) => {
    setOrderState((prev) => {
      const next = { ...prev, ...patch };
      if (patch.strategy) {
        const label = STRATEGY_OPTIONS.find((s) => s.id === patch.strategy)?.label;
        if (label) next.strategyLabel = label;
      }
      localStorage.setItem(ORDER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const persistSelection = useCallback((ids: string[]) => {
    localStorage.setItem(SELECTION_KEY, JSON.stringify(ids));
    setSelection(ids);
  }, []);

  const toggleSelection = useCallback(
    (id: string) => {
      persistSelection(
        selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id]
      );
    },
    [selection, persistSelection]
  );

  const clearSelection = useCallback(() => persistSelection([]), [persistSelection]);

  const value = useMemo(
    () => ({
      order,
      setOrder,
      selection,
      toggleSelection,
      clearSelection,
      isSelected: (id: string) => selection.includes(id),
      catalogCount,
      setCatalogCount,
    }),
    [order, setOrder, selection, toggleSelection, clearSelection, catalogCount]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function estimateScanScope(order: ScoutingOrder): number {
  let base = 24200;
  if (order.strategy === 'development') base *= 1.15;
  if (order.strategy === 'distressed') base *= 0.85;
  if (order.radiusKm > 30) base *= 1.1;
  if (order.assetTypes.length === 1) base *= 0.75;
  return Math.round(base);
}
