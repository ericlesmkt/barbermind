'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

// ==========================================
// 1. FAZER LOGIN
// ==========================================
export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Retorna para a página de login com a mensagem de erro na URL
    return redirect('/login?error=Email ou senha incorretos')
  }

  // Se deu certo, vai pro painel
  redirect('/dashboard')
}

// ==========================================
// 2. FAZER LOGOUT (SAIR)
// ==========================================
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ==========================================
// 3. ENVIAR EMAIL DE RESET DE SENHA
// ==========================================
export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string
  const supabase = await createClient()

  // Lógica inteligente para pegar a URL oficial da Vercel ou Localhost
  const getURL = () => {
    let url =
      process?.env?.NEXT_PUBLIC_SITE_URL ?? 
      (process?.env?.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    // Garante que não tem barra no final
    url = url.replace(/\/+$/, '')
    return url
  }

  const redirectTo = `${getURL()}/update-password`

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) {
    console.error('Erro do Supabase ao enviar email:', error.message)
    // Em vez de "throw new Error" (que causa a tela Application Error), redirecionamos com aviso:
    return redirect(`/login?error=Erro ao enviar o email: ${error.message}`)
  }

  // Se deu tudo certo, Redireciona para a página de "Verifique seu email"
  redirect('/check-email') 
}

// ==========================================
// 4. SALVAR A NOVA SENHA (PÓS CLIQUE NO EMAIL)
// ==========================================
export async function updateNewPassword(formData: FormData) {
  const password = formData.get('password') as string
  const supabase = await createClient()

  // O Supabase já sabe quem é o usuário porque ele clicou no link mágico
  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    console.error('Erro ao atualizar senha:', error.message)
    throw new Error('Não foi possível atualizar a senha.')
  }

  // Senha alterada com sucesso! Manda pro dashboard.
  redirect('/dashboard')
}