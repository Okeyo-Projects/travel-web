import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// POST /api/conversations - Create new conversation
export async function POST(req: NextRequest) {
  try {
    const { userId, clientId, userLocation } = await req.json();

    // Use service role for anonymous users to bypass RLS
    const supabase = userId
      ? await createClient()
      : createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: userId || null,
        client_id: clientId || null,
        user_location: userLocation || null,
      })
      .select('id, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ conversation: data });
  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

// GET /api/conversations - List user's conversations
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get clientId from query params for anonymous users
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    // For authenticated users, query by user_id
    if (user) {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('id, title, first_message, created_at, updated_at')
        .eq('user_id', user.id)
        .is('archived_at', null)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return NextResponse.json({ conversations: data || [] });
    }

    // For anonymous users, use service role and query by client_id
    if (clientId) {
      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data, error } = await serviceClient
        .from('ai_conversations')
        .select('id, title, first_message, created_at, updated_at')
        .eq('client_id', clientId)
        .is('user_id', null)
        .is('archived_at', null)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return NextResponse.json({ conversations: data || [] });
    }

    return NextResponse.json({ conversations: [] });
  } catch (error) {
    console.error('List conversations error:', error);
    return NextResponse.json(
      { error: 'Failed to list conversations' },
      { status: 500 }
    );
  }
}
