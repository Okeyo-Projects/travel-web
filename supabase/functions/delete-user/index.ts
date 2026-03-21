import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

type DeleteMode = 'hard' | 'soft';

interface DeleteUserRequest {
  userId: string;
  mode?: DeleteMode;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function deleteUser(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[delete-user] Incoming request');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.log('[delete-user] Missing Authorization header');
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: DeleteUserRequest;
  try {
    body = await req.json();
  } catch {
    console.log('[delete-user] Invalid JSON payload');
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const mode: DeleteMode = body.mode === 'soft' ? 'soft' : 'hard';
  console.log('[delete-user] Parsed body', { mode, userId: body.userId });
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  // Validate the caller's token and identity
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    console.log('[delete-user] Token validation failed', { userError });
    return new Response(JSON.stringify({ error: 'Invalid or expired token', details: userError }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!body.userId || body.userId !== user.id) {
    console.log('[delete-user] Forbidden delete attempt', { caller: user.id, target: body.userId });
    return new Response(JSON.stringify({ error: 'Forbidden: cannot delete another user' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Soft-delete profile first to preserve audit trail
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ status: 'suspended', deleted_at: new Date().toISOString() })
    .eq('id', user.id);

  if (profileError) {
    console.error('[delete-user] Failed to update profile', profileError);
    return new Response(JSON.stringify({ error: 'Failed to update profile', details: profileError }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Delete or soft-delete auth user
  // Supabase JS expects boolean (not object) for shouldSoftDelete
  let deleteError = null;
  let finalMode: DeleteMode = mode;
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id, mode === 'soft');
    deleteError = error ?? null;
  } catch (err) {
    deleteError = err as unknown;
  }

  // If hard delete fails, attempt soft delete as a fallback
  if (deleteError && mode === 'hard') {
    console.warn('[delete-user] Hard delete failed, attempting soft delete', deleteError);
    finalMode = 'soft';
    const { error: softError } = await supabaseAdmin.auth.admin.deleteUser(user.id, true);
    if (softError) {
      console.error('[delete-user] Soft delete also failed', softError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user', details: softError, triedSoftDelete: true }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    deleteError = null;
  }

  if (deleteError) {
    console.error('[delete-user] Failed to delete auth user', deleteError);
    return new Response(
      JSON.stringify({ error: 'Failed to delete user', details: deleteError, triedSoftDelete: false }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  console.log('[delete-user] Success', { userId: user.id, mode: finalMode });
  return new Response(
    JSON.stringify({
      success: true,
      mode: finalMode,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}

serve(deleteUser);
