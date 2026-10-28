import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = new URL('/api/auth/callback', url.origin);
  url.searchParams.forEach((val, key) => {
    target.searchParams.set(key, val);
  });
  return NextResponse.redirect(target.toString());
}
