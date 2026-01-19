import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/libs/errorHandler';
import { vehicleSchema } from '@/libs/validations/vehicle';
import { getAuthenticatedUser } from '@/libs/supabase/auth';
import { z } from 'zod';

/**
 * Updates an existing vehicle.
 * Enforces ownership check before modification.
 */
export const PUT = withErrorHandling(
  async (req?: Request | NextRequest, context?: { params: Promise<{ id: string }> }) => {
    const nextReq = req as NextRequest;

    try {
      const { id } = await context!.params;
      const { user, authError, supabase } = await getAuthenticatedUser(nextReq);

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await nextReq.json();
      const validationResult = vehicleSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: z.treeifyError(validationResult.error) },
          { status: 400 }
        );
      }

      // Verify ownership
      const { data: existingVehicle, error: fetchError } = await supabase
        .from('vehicles')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (fetchError || !existingVehicle) {
        return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
      }

      if (existingVehicle.owner_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .update(validationResult.data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating vehicle:', error);
        return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 });
      }

      return NextResponse.json({ vehicle });
    } catch (error) {
      console.error('Error in vehicle PUT API:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

/**
 * Deletes a vehicle.
 * Enforces ownership check before deletion.
 */
export const DELETE = withErrorHandling(
  async (req?: Request | NextRequest, context?: { params: Promise<{ id: string }> }) => {
    const nextReq = req as NextRequest;

    try {
      const { id } = await context!.params;
      const { user, authError, supabase } = await getAuthenticatedUser(nextReq);

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Verify ownership
      const { data: existingVehicle, error: fetchError } = await supabase
        .from('vehicles')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (fetchError || !existingVehicle) {
        return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
      }

      if (existingVehicle.owner_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { error } = await supabase.from('vehicles').delete().eq('id', id);

      if (error) {
        console.error('Error deleting vehicle:', error);
        return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error in vehicle DELETE API:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);
