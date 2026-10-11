'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vehicleSchema, VehicleSchema } from '@/libs/validations/vehicle';
import toast from 'react-hot-toast';

interface VehicleFormProps {
  initialData?: VehicleSchema & { id: string };
  // eslint-disable-next-line no-unused-vars
  onSuccess?: (_vehicleId?: string) => void;
  onCancel?: () => void;
}

export default function VehicleForm({
  initialData,
  onSuccess,
  onCancel,
}: Readonly<VehicleFormProps>) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<VehicleSchema>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: initialData ?? {
      make: '',
      model: '',
      year: new Date().getFullYear(),
      color: '',
      license_plate: '',
      drivetrain: null,
    },
  });

  const onSubmit = async (data: VehicleSchema) => {
    setIsSubmitting(true);
    try {
      const url = initialData
        ? `/api/community/vehicles/${initialData.id}`
        : '/api/community/vehicles';
      const method = initialData ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save vehicle');
      }

      const result = await response.json();
      toast.success(initialData ? 'Vehicle updated' : 'Vehicle added');
      onSuccess?.(result.vehicle?.id);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionLabel = initialData ? 'Update' : 'Add';
  const submitButtonLabel = isSubmitting ? 'Saving...' : `${actionLabel} Vehicle`;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="make"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Make
          </label>
          <input
            id="make"
            type="text"
            {...register('make')}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="e.g. Toyota"
          />
          {errors.make && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.make.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="model"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Model
          </label>
          <input
            id="model"
            type="text"
            {...register('model')}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="e.g. Camry"
          />
          {errors.model && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.model.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="year"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Year
          </label>
          <input
            id="year"
            type="number"
            {...register('year', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          {errors.year && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.year.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="color"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Color
          </label>
          <input
            id="color"
            type="text"
            {...register('color')}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="e.g. Silver"
          />
          {errors.color && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.color.message}</p>
          )}
        </div>

        <div>
          <Controller
            name="drivetrain"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  checked={['AWD', '4WD', 'AWD/4WD'].includes(field.value ?? '')}
                  onChange={(event) =>
                    field.onChange(
                      event.target.checked
                        ? initialData?.drivetrain === 'AWD' || initialData?.drivetrain === '4WD'
                          ? initialData.drivetrain
                          : 'AWD/4WD'
                        : null
                    )
                  }
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                My vehicle has AWD / 4WD
              </label>
            )}
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            All-wheel or four-wheel drive. Leave unchecked if your vehicle has neither.
          </p>
          {errors.drivetrain && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.drivetrain.message}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="license_plate"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            License Plate (Optional)
          </label>
          <input
            id="license_plate"
            type="text"
            {...register('license_plate')}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="e.g. ABC-123"
          />
          {errors.license_plate && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.license_plate.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitButtonLabel}
        </button>
      </div>
    </form>
  );
}
