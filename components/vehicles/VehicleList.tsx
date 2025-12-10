'use client';

import { useEffect, useState } from 'react';
import VehicleForm from './VehicleForm';
import toast from 'react-hot-toast';

interface VehicleWithId {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate?: string;
  drivetrain?: 'FWD' | 'RWD' | 'AWD' | '4WD';
}

export default function VehicleList() {
  const [vehicles, setVehicles] = useState<VehicleWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleWithId | null>(null);

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/community/vehicles', { credentials: 'include' });
      if (!response.ok) {
        const errorPayload = await response.text().catch(() => '');
        console.error('Failed to fetch vehicles:', response.status, errorPayload);
        if (response.status === 401) {
          toast.error('Please sign in to view your vehicles.');
          setVehicles([]);
          return;
        }
        throw new Error('Failed to fetch vehicles');
      }
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      const response = await fetch(`/api/community/vehicles/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete vehicle');

      toast.success('Vehicle deleted');
      fetchVehicles();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete vehicle');
    }
  };

  if (loading) return <div className="text-gray-600 dark:text-gray-300">Loading vehicles...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">My Vehicles</h3>
        {!isAdding && !editingVehicle && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Vehicle
          </button>
        )}
      </div>

      {(isAdding || editingVehicle) && (
        <VehicleForm
          initialData={editingVehicle ?? undefined}
          onSuccess={() => {
            setIsAdding(false);
            setEditingVehicle(null);
            fetchVehicles();
          }}
          onCancel={() => {
            setIsAdding(false);
            setEditingVehicle(null);
          }}
        />
      )}

      {!isAdding && !editingVehicle && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 shadow-sm bg-white dark:bg-slate-800 relative transition-colors"
            >
              <div className="absolute top-2 right-2 flex space-x-2">
                <button
                  onClick={() => setEditingVehicle(vehicle)}
                  className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 text-sm transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(vehicle.id)}
                  className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 text-sm transition-colors"
                >
                  Delete
                </button>
              </div>
              <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                {vehicle.color} • {vehicle.drivetrain || 'Unknown Drivetrain'}
              </p>
              {vehicle.license_plate && (
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  Plate: {vehicle.license_plate}
                </p>
              )}
            </div>
          ))}
          {vehicles.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-300 dark:border-slate-700">
              No vehicles added yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
