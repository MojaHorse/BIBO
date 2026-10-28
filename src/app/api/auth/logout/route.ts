import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Supabase signout notice:', err);
  }

  const res = NextResponse.json({ success: true, message: 'Signed out' });
  res.headers.set(
    'Set-Cookie',
    'obscura_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
  return res;
}
