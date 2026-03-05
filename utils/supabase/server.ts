import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 1. Transformamos a função em async
export async function createClient() {
  // 2. Adicionamos o await aqui para resolver a Promise do Next.js 15+
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Pode ser ignorado com segurança caso o set seja chamado 
            // a partir de um Server Component sem permissão de escrita de headers.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Tratamento similar ao set
          }
        },
      },
    }
  )
}