import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthGateway } from '@/modules/auth/supabase-gateway'

export async function GET(request: NextRequest) {
  try {
    const gateway = createSupabaseAuthGateway()

    if (!gateway) {
      return NextResponse.json({ session: null }, { status: 200 })
    }

    const session = await gateway.getSession()

    return NextResponse.json({ session }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
      }
    })
  } catch (error) {
    console.error('Auth session error:', error)
    return NextResponse.json({ session: null }, { status: 200 })
  }
}