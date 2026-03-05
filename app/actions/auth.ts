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

  // Precisamos dizer para onde o email deve mandar o usuário de volta!
  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL 
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/update-password` 
    : 'http://localhost:3000/update-password'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) {
    console.error('Erro ao enviar email de reset:', error.message)
    throw new Error('Não foi possível enviar o email.')
  }

  // Redireciona para uma página de "Verifique seu email"
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