import { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';

// Mes del gasto mas antiguo del usuario: undefined mientras carga, null si
// nunca registro ningun gasto. Sirve de tope para el selector de mes, para
// no dejar navegar hacia atras a meses que nunca tuvieron datos.
export function useEarliestExpenseMonth() {
  const [minMonth, setMinMonth] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('occurred_on')
        .order('occurred_on', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data) {
        const d = new Date(`${data.occurred_on}T00:00:00`);
        d.setDate(1);
        setMinMonth(d);
      } else {
        setMinMonth(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return minMonth;
}
