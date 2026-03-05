'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addStockIntake(productId: string, quantity: number, newCostPrice?: number) {
  const supabase = await createClient()

  try {
    // 1. Busca o estoque atual
    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single()

    if (!product) throw new Error('Produto não encontrado')

    // 2. Prepara o update
    const updateData: any = {
      stock_quantity: product.stock_quantity + quantity
    }
    
    if (newCostPrice) {
      updateData.cost_price = newCostPrice
    }

    // 3. Atualiza o banco
    const { error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)

    if (error) throw error

  } catch (error) {
    console.error('Erro no abastecimento:', error)
    throw new Error('Falha ao atualizar estoque.')
  }

  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/new') // Atualiza a vitrine de agendamento
}
// ==========================================
// CRIAR NOVO PRODUTO DO ZERO
// ==========================================
export async function createNewProduct(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const price = parseFloat(formData.get('price') as string) || 0
  const cost_price = parseFloat(formData.get('cost_price') as string) || 0
  const stock_quantity = parseInt(formData.get('stock_quantity') as string) || 0
  const min_stock_alert = parseInt(formData.get('min_stock_alert') as string) || 5

  const barbershopId = '11111111-1111-1111-1111-111111111111'

  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        barbershop_id: barbershopId,
        name,
        category,
        // Se for insumo interno, não tem preço de venda
        price: category === 'venda' ? price : 0, 
        cost_price,
        stock_quantity,
        min_stock_alert
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/new') 
    
    return data

  } catch (error) {
    console.error('Erro ao criar produto:', error)
    throw new Error('Falha ao cadastrar produto no banco.')
  }
}