#!/usr/bin/env python3
# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
WebSocket-enabled FastAPI server startup script.

This script starts the FastAPI application with WebSocket support for
Phase 2 real-time collaboration features.

Usage:
    python run_websocket_server.py [--host HOST] [--port PORT] [--reload]
"""

import asyncio
import os
import sys
import argparse
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

import uvicorn
import socketio
from app.modules.websocket.integration import create_socketio_app
from app.main import create_app


def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Start WebSocket-enabled FastAPI server")

    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="Host to bind the server to (default: 0.0.0.0)"
    )

    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to bind the server to (default: 8000)"
    )

    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload for development"
    )

    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug mode"
    )

    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Number of worker processes (default: 1)"
    )

    parser.add_argument(
        "--log-level",
        choices=["critical", "error", "warning", "info", "debug"],
        default="info",
        help="Log level (default: info)"
    )

    return parser.parse_args()


def create_application(debug: bool = False) -> socketio.ASGIApp:
    """Create the WebSocket-enabled ASGI application."""
    # Create FastAPI app with WebSocket integration
    if debug:
        # Development configuration with debugging enabled
        from app.modules.websocket.integration import create_dev_websocket_app
        fastapi_app = create_dev_websocket_app()
    else:
        # Production configuration
        fastapi_app = create_app()

    # Create Socket.IO ASGI app
    socketio_app = create_socketio_app(fastapi_app)

    return socketio_app


async def main() -> None:
    """Main application entry point."""
    args = parse_arguments()

    # Set environment variables
    os.environ["PYTHONPATH"] = str(project_root)

    if args.debug:
        os.environ["DEBUG"] = "true"

    print("🚀 Starting WebSocket-enabled FastAPI server...")
    print(f"📍 Host: {args.host}")
    print(f"🔌 Port: {args.port}")
    print(f"🔄 Reload: {args.reload}")
    print(f"🐛 Debug: {args.debug}")
    print(f"👷 Workers: {args.workers}")
    print(f"📊 Log Level: {args.log_level}")
    print()

    # Create the application
    app = create_application(debug=args.debug)

    # Configure uvicorn
    config = uvicorn.Config(
        app=app,
        host=args.host,
        port=args.port,
        reload=args.reload,
        workers=1 if args.reload else args.workers,
        log_level=args.log_level,
        access_log=True,
        use_colors=True,
    )

    # Start the server
    server = uvicorn.Server(config)

    try:
        print("✅ WebSocket server is ready to accept connections")
        print("🔗 Real-time collaboration endpoints are available")
        print("📊 WebSocket stats: http://{}:{}/api/v1/websocket/stats".format(args.host, args.port))
        print("❤️  Health check: http://{}:{}/api/v1/websocket/health".format(args.host, args.port))
        print()

        await server.serve()

    except KeyboardInterrupt:
        print("\n🛑 Shutting down WebSocket server...")
        await server.shutdown()
        print("✅ Server stopped gracefully")

    except Exception as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Server interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)