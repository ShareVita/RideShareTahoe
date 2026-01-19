import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/libs/errorHandler';

// This route is used to store the leads that are generated from the landing page.
// The API call is initiated by <ButtonLead /> component
export const POST = withErrorHandling(async (request?: Request | NextRequest) => {
  const req = request as NextRequest;
  const body = await req.json();

  if (!body.email) {
    return NextResponse.json(
      { error: 'Email is required' },
      {
        status: 400,
      }
    );
  }

  try {
    // Here you can add your own logic
    // For instance, sending a welcome email (use the the sendEmail helper function from /libs/resend)
    // For instance, saving the lead in the database (uncomment the code below)

    return NextResponse.json({});
  } catch (e: unknown) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
