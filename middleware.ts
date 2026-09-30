import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** Collapse www → apex (preserving path + query) so Google does not keep
 * crawling duplicate hosts that used to serve noindex compare URLs. */
export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase()
  if (hostname === 'www.mapstoit.com') {
    const url = request.nextUrl.clone()
    url.hostname = 'mapstoit.com'
    url.protocol = 'https:'
    url.port = ''
    return NextResponse.redirect(url, 301)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
