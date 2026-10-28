import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true, message: 'Signed out' });
  res.headers.set(
    'Set-Cookie',
    'obscura_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
  return res;
}
