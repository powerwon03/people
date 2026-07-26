import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('saehan_equipment')
    .select('*, factory:saehan_factories(name)')
    .order('factory_id')
    .order('sort_order');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('saehan_equipment')
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const body = await request.json();
  const { id, ...updates } = body;

  const { data, error } = await supabase
    .from('saehan_equipment')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id 필수' }, { status: 400 });
  }

  const { error } = await supabase
    .from('saehan_equipment')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
