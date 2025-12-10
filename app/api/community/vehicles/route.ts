import { NextRequest, NextResponse } from 'next/server';
import { vehicleSchema } from '@/libs/validations/vehicle';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  ensureProfileComplete,
} from '@/libs/supabase/auth';

/**
 * Retrieves all vehicles owned by the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }

    return NextResponse.json({ vehicles });
  } catch (error) {
    console.error('Error in vehicles GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Registers a new vehicle for the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    const profileError = await ensureProfileComplete(supabase, user.id, 'adding vehicles');
    if (profileError) return profileError;

    const body = await request.json();
    const validationResult = vehicleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: z.treeifyError(validationResult.error) },
        { status: 400 }
      );
    }

    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .insert({
        ...validationResult.data,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle:', error);
      return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 });
    }

    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error('Error in vehicles POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
