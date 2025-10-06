import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validate email input
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      )
    }

    // Step 1: Save email to Supabase database
    const { data: supabaseData, error: supabaseError } = await supabase
      .from('waitlist')
      .insert([{ email: email }])
      .select()

    // Handle duplicate email error (unique constraint violation)
    if (supabaseError && supabaseError.code === '23505') {
      return NextResponse.json({
        success: true,
        message: 'You\'re already on the waitlist!',
        alreadyExists: true
      })
    }

    // Handle other Supabase errors
    if (supabaseError) {
      console.error('Supabase error:', supabaseError)
      // Continue with email sending even if database fails
    }

    // Step 2: Send email notification via ZeptoMail
    try {
      const emailData = {
        from: 'Yourever <noreply@yourever.com>',
        to: 'your-email@example.com', // TODO: Replace with your actual email
        subject: 'New Waitlist Signup!',
        htmlBody: `<h1>New Waitlist Signup</h1><p>Email: ${email}</p>`
      }

      const emailResponse = await fetch('https://api.zeptomail.com/v1.1/pm/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `${process.env.ZEPTOMAIL_TOKEN}`
        },
        body: JSON.stringify(emailData)
      })

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json()
        console.error('Email sending error:', errorData)
        // Continue even if email fails, as long as database save worked
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError)
      // Continue even if email fails
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: 'Successfully joined the waitlist!',
      data: supabaseData
    })

  } catch (error) {
    console.error('Waitlist API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}