import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    const data = {
      from: 'Yourever <noreply@yourever.com>',
      to: 'your-email@example.com', // TODO: Replace with your actual email
      subject: 'New Waitlist Signup!',
      htmlBody: `<h1>New Waitlist Signup</h1><p>Email: ${email}</p>`
    }

    const response = await fetch('https://api.zeptomail.com/v1.1/pm/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `${process.env.ZEPTOMAIL_TOKEN}`
      },
      body: JSON.stringify(data)
    })

    if (response.ok) {
      return NextResponse.json({ success: true })
    } else {
      const errorData = await response.json()
      throw new Error(`Failed to send email: ${JSON.stringify(errorData)}`)
    }
  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}