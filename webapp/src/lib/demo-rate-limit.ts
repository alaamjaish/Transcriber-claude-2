import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_TRIALS_PER_DAY = 3;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetDate: string;
}

/**
 * Check if an IP address is allowed to perform a demo trial
 * Returns the number of remaining trials and whether the request is allowed
 */
export async function checkDemoRateLimit(ipAddress: string): Promise<RateLimitResult> {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Try to find existing record for this IP and today's date
  const { data: existingRecord, error: fetchError } = await supabase
    .from('demo_trials')
    .select('trial_count, last_trial_date')
    .eq('ip_address', ipAddress)
    .eq('last_trial_date', today)
    .maybeSingle();

  if (fetchError) {
    console.error('Error checking demo rate limit:', fetchError);
    // On error, deny the request to be safe
    return {
      allowed: false,
      remaining: 0,
      resetDate: getNextDayReset(),
    };
  }

  // No record for today - this is their first trial
  if (!existingRecord) {
    return {
      allowed: true,
      remaining: MAX_TRIALS_PER_DAY - 1, // Will be 2 after this trial
      resetDate: getNextDayReset(),
    };
  }

  // Check if they've exceeded the limit
  const currentCount = existingRecord.trial_count || 0;
  if (currentCount >= MAX_TRIALS_PER_DAY) {
    return {
      allowed: false,
      remaining: 0,
      resetDate: getNextDayReset(),
    };
  }

  // They're under the limit
  return {
    allowed: true,
    remaining: MAX_TRIALS_PER_DAY - currentCount - 1,
    resetDate: getNextDayReset(),
  };
}

/**
 * Increment the trial count for an IP address
 */
export async function incrementDemoTrialCount(ipAddress: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Try to find existing record for today
  const { data: existingRecord } = await supabase
    .from('demo_trials')
    .select('id, trial_count')
    .eq('ip_address', ipAddress)
    .eq('last_trial_date', today)
    .maybeSingle();

  if (existingRecord) {
    // Update existing record
    await supabase
      .from('demo_trials')
      .update({
        trial_count: (existingRecord.trial_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRecord.id);
  } else {
    // Create new record for today
    await supabase
      .from('demo_trials')
      .insert({
        ip_address: ipAddress,
        trial_count: 1,
        last_trial_date: today,
      });
  }
}

/**
 * Get the reset time (midnight UTC tomorrow)
 */
function getNextDayReset(): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * Get the client's IP address from request headers
 */
export function getClientIp(headers: Headers): string {
  // Try various headers that might contain the real IP
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to a placeholder (in development)
  return headers.get('x-forwarded-for') || '127.0.0.1';
}
