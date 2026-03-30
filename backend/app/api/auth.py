from __future__ import annotations

from datetime import datetime, timedelta, timezone

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    UserResponse,
)
from app.services.auth import (
    create_access_token,
    create_reset_token,
    hash_password,
    verify_password,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest) -> AuthResponse:
    async with AsyncSessionLocal() as session:
        # Check duplicate email
        result = await session.execute(
            select(User).where(User.email == request.email.lower())
        )
        if result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        # Create user with free plan defaults
        user = User(
            email=request.email.lower(),
            password_hash=hash_password(request.password),
            full_name=request.full_name,
            plan="free",
            credits_remaining=3,
            credits_reset_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    token = create_access_token(str(user.id), user.plan)
    return AuthResponse(
        user=UserResponse.model_validate(user),
        token=token,
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest) -> AuthResponse:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == request.email.lower())
        )
        user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token(str(user.id), user.plan)
    return AuthResponse(
        user=UserResponse.model_validate(user),
        token=token,
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(request: ForgotPasswordRequest) -> MessageResponse:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == request.email.lower())
        )
        user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found",
        )

    token = create_reset_token()

    # Store reset token in Redis with 1-hour TTL
    r = aioredis.from_url(settings.redis_url)
    try:
        await r.setex(f"reset:{token}", 3600, str(user.id))
    finally:
        await r.aclose()

    # MVP: log reset URL to console
    print(f"Password reset link: {settings.app_url}/auth/reset?token={token}")

    return MessageResponse(message="Reset link sent")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(request: ResetPasswordRequest) -> MessageResponse:
    r = aioredis.from_url(settings.redis_url)
    try:
        user_id = await r.get(f"reset:{request.token}")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired token",
            )

        # Update user password
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(User).where(User.id == user_id.decode())
            )
            user = result.scalar_one_or_none()
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired token",
                )
            user.password_hash = hash_password(request.new_password)
            await session.commit()

        # Delete used token
        await r.delete(f"reset:{request.token}")
    finally:
        await r.aclose()

    return MessageResponse(message="Password updated")


@router.get("/me")
async def me(
    current_user: User = Depends(get_current_user),
) -> dict:
    return {"user": UserResponse.model_validate(current_user)}
