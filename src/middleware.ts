import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { jwtVerify } from 'jose';

const intlMiddleware = createIntlMiddleware(routing);

const SECRET_KEY = new TextEncoder().encode(
    process.env.AUTH_SECRET || 'your-secret-key-min-32-chars-long!'
);

const protectedPaths = ['/search'];

async function isAuthenticated(request: NextRequest): Promise<boolean> {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return false;

    try {
        await jwtVerify(token, SECRET_KEY);
        return true;
    } catch {
        return false;
    }
}

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip API routes
    if (pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    // Check if path needs protection (remove locale prefix for check)
    const pathWithoutLocale = pathname.replace(/^\/(zh|en)/, '') || '/';
    const needsAuth = protectedPaths.some(path => pathWithoutLocale.startsWith(path));

    if (needsAuth) {
        const authenticated = await isAuthenticated(request);
        if (!authenticated) {
            // Redirect to home page
            const locale = pathname.match(/^\/(zh|en)/)?.[1] || 'zh';
            return NextResponse.redirect(new URL(`/${locale}`, request.url));
        }
    }

    // Run i18n middleware
    return intlMiddleware(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, manifest.json, sw.js
         * - icons folder
         * - any files with extensions (.png, .jpg, .svg, etc.)
         */
        '/((?!api|_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|icons|.*\\..*).*)',
    ]
};
