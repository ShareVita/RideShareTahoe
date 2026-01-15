'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
}

export default function VehicleDisplay({ userId }: Readonly<{ userId: string }>) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setVehicles(data);
      }
      setLoading(false);
    };

    fetchVehicles();
  }, [userId]);

  if (loading) return null;
  if (vehicles.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Vehicles</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600"
          >
            <p className="font-medium text-gray-900 dark:text-white">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{vehicle.color}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
