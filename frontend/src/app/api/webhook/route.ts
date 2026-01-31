import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Chainhook webhook received:', body);

    // Process the chainhook event
    // For example, log new blocks or events

    // You can add logic here to handle the event, like updating database, sending notifications, etc.

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
