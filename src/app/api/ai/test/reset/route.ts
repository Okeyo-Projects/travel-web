export async function POST(req: Request) {
  try {
    const { conversation_id } = await req.json();

    if (!conversation_id) {
      return Response.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      );
    }

    // Note: This is a simplified version. In production, you'd clear from actual storage
    // For now, just return success (the in-memory Map in chat/route.ts is per-process)

    return Response.json({
      success: true,
      message: `Conversation ${conversation_id} reset. Next message will start fresh.`,
    });
  } catch (error) {
    console.error('Test reset API error:', error);
    return Response.json(
      {
        error: 'Failed to reset conversation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
