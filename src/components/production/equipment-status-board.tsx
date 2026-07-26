'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type EquipmentItem = {
  id: string;
  code: string;
  name: string | null;
  type: string | null;
  stage: string | null;
  air_usage_33k: number;
  air_usage_25k: number;
  is_active: boolean;
  factory_id: string;
  factory: { id: string; name: string } | null;
};

type Props = {
  equipment: EquipmentItem[];
};

export function EquipmentStatusBoard({ equipment }: Props): React.ReactElement {
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: EquipmentItem[] }>();
    equipment.forEach((eq) => {
      const factoryName = eq.factory?.name ?? '기타';
      const factoryId = eq.factory_id;
      if (!map.has(factoryId)) {
        map.set(factoryId, { name: factoryName, items: [] });
      }
      map.get(factoryId)!.items.push(eq);
    });
    return Array.from(map.entries());
  }, [equipment]);

  return (
    <div className="space-y-6">
      {grouped.map(([factoryId, { name, items }]) => {
        const totalAir33k = items.reduce((s, e) => s + (e.air_usage_33k ?? 0), 0);
        const totalAir25k = items.reduce((s, e) => s + (e.air_usage_25k ?? 0), 0);

        return (
          <div key={factoryId} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{name}</h2>
              <div className="text-muted-foreground text-sm">
                {items.length}대 | 33k: {totalAir33k.toFixed(1)}㎥/min | 25k: {totalAir25k.toFixed(1)}㎥/min
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {items.map((eq) => (
                <Card key={eq.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-bold">{eq.code}</span>
                    <Badge variant="default">가동</Badge>
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {eq.type ?? eq.name ?? '-'}
                  </div>
                  {(eq.air_usage_33k > 0 || eq.air_usage_25k > 0) && (
                    <div className="text-muted-foreground mt-1 font-mono text-xs">
                      {eq.air_usage_33k > 0 && `33k: ${eq.air_usage_33k}`}
                      {eq.air_usage_33k > 0 && eq.air_usage_25k > 0 && ' | '}
                      {eq.air_usage_25k > 0 && `25k: ${eq.air_usage_25k}`}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
