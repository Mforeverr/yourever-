/**
 * Simple health check endpoint
 *
 * This endpoint provides basic health status information for the frontend
 * to verify backend connectivity and configuration.
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-23
 * Role: Frontend Architecture
 */

import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      frontend: 'Next.js application is running',
      auth_check: 'Frontend can reach this endpoint'
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    })
  }
}