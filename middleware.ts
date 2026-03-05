import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // 1. Prepara a resposta padrão
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // 2. Conecta ao Supabase para ler os Cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  // 3. Checa se o usuário tem um "crachá" válido
  const { data: { user } } = await supabase.auth.getUser()

  // 4. A REGRA DE OURO: Tentar acessar o dashboard sem login = Expulso para o /login
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se já estiver logado e tentar abrir a tela de login de novo, manda pro dashboard
  if (request.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// Onde o cão de guarda deve farejar (ignorando imagens e arquivos estáticos)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}