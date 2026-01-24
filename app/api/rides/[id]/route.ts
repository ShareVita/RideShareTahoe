import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/libs/supabase/auth';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Updates a ride or series of rides.
 * Query params:
 * - apply_to=single|future|series - scope of update
 *   - single: update just this ride
 *   - future: update this ride and all future rides in the series
 *   - series: update all rides in the series (including past)
 *
 * For multi-date series, uses round_trip_group_id and is_recurring=true
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    // Await params for Next.js 15+
    const { id } = await context.params;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const applyTo = searchParams.get('apply_to') || 'single';

    // Verify ownership of the ride
    const { data: ride, error: fetchError } = await supabase
      .from('rides')
      .select('id, poster_id, round_trip_group_id, is_recurring, departure_date')
      .eq('id', id)
      .single();

    if (fetchError || !ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    if (ride.poster_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Prepare update data (exclude fields that shouldn't be updated)
    const updateData = { ...body };
    delete updateData.id;
    delete updateData.poster_id;
    delete updateData.created_at;
    delete updateData.round_trip_group_id;

    // Handle different scopes for multi-date series
    if (ride.round_trip_group_id && ride.is_recurring) {
      if (applyTo === 'series') {
        // Update ALL rides in the series (including past)
        const { data: updatedRides, error: updateError } = await supabase
          .from('rides')
          .update(updateData)
          .eq('round_trip_group_id', ride.round_trip_group_id)
          .eq('is_recurring', true)
          .select();

        if (updateError) {
          console.error('Error updating ride series:', updateError);
          return NextResponse.json(
            { error: 'Failed to update ride series', details: updateError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          message: `Updated ${updatedRides.length} rides in series`,
          rides: updatedRides,
        });
      } else if (applyTo === 'future') {
        // Update this ride and all future rides in the series
        const { data: updatedRides, error: updateError } = await supabase
          .from('rides')
          .update(updateData)
          .eq('round_trip_group_id', ride.round_trip_group_id)
          .eq('is_recurring', true)
          .gte('departure_date', ride.departure_date)
          .select();

        if (updateError) {
          console.error('Error updating future rides:', updateError);
          return NextResponse.json(
            { error: 'Failed to update future rides', details: updateError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          message: `Updated ${updatedRides.length} rides`,
          rides: updatedRides,
        });
      }
    }

    // Default: Update single ride only
    const { data: updatedRide, error: updateError } = await supabase
      .from('rides')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating ride:', updateError);
      return NextResponse.json(
        { error: 'Failed to update ride', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedRide);
  } catch (error: unknown) {
    console.error('Update ride API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}

/**
 * Deletes a ride or series of rides.
 * Query params:
 * - apply_to=single|future|series - scope of deletion
 *   - single: delete just this ride
 *   - future: delete this ride and all future rides in the series
 *   - series: delete all rides in the series (including past)
 *
 * For multi-date series, uses round_trip_group_id and is_recurring=true
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    // Await params for Next.js 15+
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const applyTo = searchParams.get('apply_to') || 'single';

    // Verify ownership of the ride
    const { data: ride, error: fetchError } = await supabase
      .from('rides')
      .select('id, poster_id, round_trip_group_id, is_recurring, departure_date')
      .eq('id', id)
      .single();

    if (fetchError || !ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    if (ride.poster_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Handle different scopes for multi-date series
    if (ride.round_trip_group_id) {
      if (applyTo === 'series') {
        // Delete ALL rides in the group (including past ones)
        const { data: deletedRides, error: deleteError } = await supabase
          .from('rides')
          .delete()
          .eq('round_trip_group_id', ride.round_trip_group_id)
          .select('id');

        if (deleteError) {
          console.error('Error deleting ride group:', deleteError);
          return NextResponse.json(
            { error: 'Failed to delete ride group', details: deleteError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          message: `Deleted ${deletedRides.length} rides`,
          deletedIds: deletedRides.map((r) => r.id),
        });
      } else if (applyTo === 'future') {
        // Delete this ride and all future rides in the series
        const { data: deletedRides, error: deleteError } = await supabase
          .from('rides')
          .delete()
          .eq('round_trip_group_id', ride.round_trip_group_id)
          .gte('departure_date', ride.departure_date)
          .select('id');

        if (deleteError) {
          console.error('Error deleting future rides:', deleteError);
          return NextResponse.json(
            { error: 'Failed to delete future rides', details: deleteError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          message: `Deleted ${deletedRides.length} rides`,
          deletedIds: deletedRides.map((r) => r.id),
        });
      }
    }

    // Default: Delete single ride only
    const { error: deleteError } = await supabase.from('rides').delete().eq('id', id);

    if (deleteError) {
      console.error('Error deleting ride:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete ride', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Ride deleted successfully', deletedIds: [id] });
  } catch (error: unknown) {
    console.error('Delete ride API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}

/**
 * GET endpoint for fetching a single ride by ID.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { user, authError, supabase } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return createUnauthorizedResponse(authError);
    }

    // Await params for Next.js 15+
    const { id } = await context.params;

    const { data: ride, error } = await supabase.from('rides').select('*').eq('id', id).single();

    if (error || !ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    return NextResponse.json(ride);
  } catch (error: unknown) {
    console.error('Fetch ride API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}
