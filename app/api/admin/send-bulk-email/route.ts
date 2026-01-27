import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/libs/supabase/auth';
import { z } from 'zod';
import { sendEmail } from '@/libs/resend';
import { strictRateLimit } from '@/libs/rateLimit';

interface BulkEmailResult {
  totalUsers: number;
  successful: number;
  failed: number;
  errors: { email: string; error: string }[];
}

interface BatchResult {
  success: boolean;
  email: string;
  error?: string;
}

const updateResultsWithBatch = (results: BulkEmailResult, batchResults: BatchResult[]) => {
  for (const result of batchResults) {
    if (result.success) {
      results.successful++;
    } else {
      results.failed++;
      if (result.email && result.error) {
        results.errors.push({
          email: result.email,
          error: result.error,
        });
      }
    }
  }
};

/**
 * Parse an incoming `delayMs` value into a safe integer (or `NaN` if unparsable).
 * Accepts numbers or strings; trims string input and prefers `Number()` parsing,
 * falling back to `parseInt` when appropriate. Returns a floored integer.
 */
// zod schemas for parsing and validating incoming `delayMs` and `batchSize` values
const delaySchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    const t = val.trim();
    if (t === '') return undefined;
    const n = Number(t);
    if (Number.isFinite(n)) return Math.floor(n);
    const p = parseInt(t, 10);
    return Number.isNaN(p) ? undefined : p;
  }
  if (typeof val === 'number' && Number.isFinite(val)) return Math.floor(val);
  return undefined;
}, z.number().int().min(0).max(10000));

const batchSizeSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    const t = val.trim();
    if (t === '') return undefined;
    const n = Number(t);
    if (Number.isFinite(n)) return Math.floor(n);
    const p = parseInt(t, 10);
    return Number.isNaN(p) ? undefined : p;
  }
  if (typeof val === 'number' && Number.isFinite(val)) return Math.floor(val);
  return undefined;
}, z.number().int().min(1).max(100).default(50));

/**
 * Sends bulk emails to users.
 * Supports batch processing, rate limiting, and email personalization.
 */
export async function POST(request: NextRequest) {
  const { user, authError, supabase } = await getAuthenticatedUser(request);

  if (authError || !user) {
    return createUnauthorizedResponse(authError);
  }

  // Check for admin role
  // If user.role is not present, fetch from supabase
  let isAdmin = false;
  if (user.role && user.role === 'admin') {
    isAdmin = true;
  } else if (supabase) {
    // Try to fetch user role from database
    const { data, error } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!error && data && data.role === 'admin') {
      isAdmin = true;
    }
  }
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }
  try {
    // Apply rate limiting
    const rateLimitResult = strictRateLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: rateLimitResult.error?.message || 'Rate limit exceeded',
        },
        {
          status: 429,
          headers: {
            'Retry-After': (rateLimitResult.error?.retryAfter || 60).toString(),
          },
        }
      );
    }

    const {
      subject,
      htmlContent,
      textContent,
      batchSize = 50,
      delayMs = 1000,
    } = await request.json();

    const delayParsed = delaySchema.safeParse(delayMs);
    if (!delayParsed.success) {
      return NextResponse.json(
        { error: 'Delay must be between 0 and 10000 milliseconds' },
        { status: 400 }
      );
    }
    const safeDelayMs = delayParsed.data;

    if (!subject || !htmlContent) {
      return NextResponse.json(
        {
          error: 'Subject and HTML content are required',
        },
        { status: 400 }
      );
    }

    // Validate batch size using zod
    const batchParsed = batchSizeSchema.safeParse(batchSize);
    if (!batchParsed.success) {
      return NextResponse.json({ error: 'Batch size must be between 1 and 100' }, { status: 400 });
    }
    const safeBatchSize = batchParsed.data;

    // Get all users with email addresses (email is in user_private_info)
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, user_private_info(email)')
      .eq('is_banned', false)
      .not('user_private_info.email', 'is', null)
      .not('user_private_info.email', 'eq', '');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        {
          status: 500,
        }
      );
    }

    // Filter users with valid emails and transform the data
    const usersWithEmails = (users || [])
      .map((user) => {
        // Handle Supabase's JOIN response format (can be array or object)
        const privateInfo = Array.isArray(user.user_private_info)
          ? user.user_private_info[0]
          : user.user_private_info;
        const email = privateInfo?.email;
        if (!email) return null;
        return {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email,
        };
      })
      .filter((user): user is NonNullable<typeof user> => user !== null);

    if (usersWithEmails.length === 0) {
      return NextResponse.json(
        { error: 'No users with email addresses found' },
        {
          status: 404,
        }
      );
    }

    console.log(`Found ${usersWithEmails.length} users to email`);

    // Process users in batches
    const results: BulkEmailResult = {
      totalUsers: usersWithEmails.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < usersWithEmails.length; i += safeBatchSize) {
      const batch = usersWithEmails.slice(i, i + safeBatchSize);
      console.log(
        `Processing batch ${Math.floor(i / safeBatchSize) + 1}/${Math.ceil(usersWithEmails.length / safeBatchSize)}`
      );

      // Process batch in parallel with retry logic
      const batchPromises = batch.map(async (user) => {
        const maxRetries = 2;
        let lastError: Error | null = null;
        // Email was already extracted during the usersWithEmails transformation
        const userEmail = user.email;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            // Personalize email content
            const personalizedHtml = htmlContent
              .replaceAll('{{first_name}}', user.first_name || '')
              .replaceAll('{{last_name}}', user.last_name || '')
              .replaceAll('{{email}}', userEmail);

            const personalizedText = textContent
              ? textContent
                  .replaceAll('{{first_name}}', user.first_name || '')
                  .replaceAll('{{last_name}}', user.last_name || '')
                  .replaceAll('{{email}}', userEmail)
              : undefined;

            await sendEmail({
              to: userEmail,
              subject,
              html: personalizedHtml,
              text: personalizedText,
            });

            return { success: true, email: userEmail };
          } catch (error: unknown) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`Attempt ${attempt + 1} failed for ${userEmail}:`, lastError.message);

            // If this is not the last attempt, wait before retrying
            if (attempt < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            }
          }
        }

        // All retries failed
        console.error(`All retries failed for ${userEmail}:`, lastError?.message);
        return {
          success: false,
          email: userEmail,
          error: lastError?.message || 'Unknown error',
        };
      });

      const batchResults = await Promise.all(batchPromises);

      // Update results
      updateResultsWithBatch(results, batchResults);

      // Add delay between batches to respect rate limits
      if (i + safeBatchSize < usersWithEmails.length) {
        await new Promise((resolve) => setTimeout(resolve, safeDelayMs));
      }
    }

    console.log(`Bulk email completed: ${results.successful} successful, ${results.failed} failed`);

    return NextResponse.json({
      message: 'Bulk email processing completed',
      results,
    });
  } catch (error) {
    console.error('Bulk email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
      }
    );
  }
}
