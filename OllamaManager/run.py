"""Entry point for running the Ollama Manager API"""

import uvicorn
import os

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    uvicorn.run(
        "src.ollama_manager.main:app",
        host=host,
        port=port,
        reload=debug,
        workers=1,
        access_log=True
    )
