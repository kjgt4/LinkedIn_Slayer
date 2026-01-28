"""
Clerk JWT Authentication for FastAPI
"""
import jwt
import httpx
from fastapi import HTTPException, Security, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Annotated, Optional, Dict, Any
import os
import logging
from functools import lru_cache
import time

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

# Cache for JWKS keys (refresh every hour)
_jwks_cache = {"keys": None, "fetched_at": 0}
JWKS_CACHE_TTL = 3600  # 1 hour

class ClerkAuthError(HTTPException):
    """Custom exception for Clerk authentication errors"""
    def __init__(self, detail: str, status_code: int = status.HTTP_401_UNAUTHORIZED):
        super().__init__(status_code=status_code, detail=detail)

async def get_clerk_jwks() -> Dict:
    """Fetch Clerk's JWKS (JSON Web Key Set) for token verification"""
    global _jwks_cache
    
    current_time = time.time()
    if _jwks_cache["keys"] and (current_time - _jwks_cache["fetched_at"]) < JWKS_CACHE_TTL:
        return _jwks_cache["keys"]
    
    clerk_frontend_api = os.environ.get("CLERK_FRONTEND_API")
    clerk_secret_key = os.environ.get("CLERK_SECRET_KEY", "")
    
    # Extract instance ID from secret key (sk_test_xxx or sk_live_xxx)
    if clerk_secret_key.startswith("sk_test_") or clerk_secret_key.startswith("sk_live_"):
        # JWKS endpoint is based on the Clerk domain
        jwks_url = "https://api.clerk.com/v1/jwks"
    else:
        jwks_url = "https://api.clerk.com/v1/jwks"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                jwks_url,
                headers={"Authorization": f"Bearer {clerk_secret_key}"},
                timeout=10.0
            )
            response.raise_for_status()
            _jwks_cache["keys"] = response.json()
            _jwks_cache["fetched_at"] = current_time
            return _jwks_cache["keys"]
    except Exception as e:
        logger.error(f"Failed to fetch Clerk JWKS: {str(e)}")
        if _jwks_cache["keys"]:
            return _jwks_cache["keys"]  # Return stale cache if available
        raise ClerkAuthError(f"Failed to fetch authentication keys: {str(e)}")

def get_public_key_from_jwks(jwks: Dict, kid: str) -> str:
    """Extract the correct public key from JWKS based on key ID"""
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    raise ClerkAuthError("Matching key not found in JWKS")

async def verify_clerk_token(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)]
) -> Optional[Dict[str, Any]]:
    """Verify Clerk JWT token and return claims. Returns None if no token provided."""
    if not credentials:
        return None
    
    token = credentials.credentials
    
    try:
        # First, decode without verification to get the header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        alg = unverified_header.get("alg", "RS256")
        
        if not kid:
            raise ClerkAuthError("Token missing key ID (kid)")
        
        # Get JWKS and find the matching key
        jwks = await get_clerk_jwks()
        jwk = get_public_key_from_jwks(jwks, kid)
        
        # Convert JWK to PEM format for verification
        from jwt import PyJWK
        public_key = PyJWK.from_dict(jwk).key
        
        # Verify and decode the token
        payload = jwt.decode(
            token,
            public_key,
            algorithms=[alg],
            options={
                "verify_aud": False,  # Clerk doesn't always set audience
                "verify_iss": False,  # We verify manually if needed
            }
        )
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise ClerkAuthError("Token has expired")
    except jwt.InvalidTokenError as e:
        raise ClerkAuthError(f"Invalid token: {str(e)}")
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise ClerkAuthError(f"Token verification failed: {str(e)}")

async def get_current_user_id(
    payload: Annotated[Optional[Dict[str, Any]], Depends(verify_clerk_token)]
) -> Optional[str]:
    """Extract and return the current user's Clerk ID from token claims"""
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        raise ClerkAuthError("User ID not found in token")
    return user_id

async def require_auth(
    user_id: Annotated[Optional[str], Depends(get_current_user_id)]
) -> str:
    """Dependency that requires authentication - raises error if not authenticated"""
    if not user_id:
        raise ClerkAuthError("Authentication required")
    return user_id

# Type aliases for cleaner route signatures
OptionalUserId = Annotated[Optional[str], Depends(get_current_user_id)]
RequiredUserId = Annotated[str, Depends(require_auth)]
