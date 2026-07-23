import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Basic ')) {
    const encoded = authHeader.slice(6)
    const decoded = atob(encoded)
    const colon = decoded.indexOf(':')
    const username = decoded.slice(0, colon)
    const password = decoded.slice(colon + 1)

    const validUser = process.env.ADMIN_USERNAME
    const validPass = process.env.ADMIN_PASSWORD

    if (validUser && validPass && username === validUser && password === validPass) {
      return NextResponse.next()
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Offerdy Admin"' },
  })
}

export const config = {
  matcher: ['/admin/:path*', '/api/import/:path*', '/api/check-links/:path*', '/api/ai/content/:path*'],
}
