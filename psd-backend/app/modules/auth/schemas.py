from pydantic import BaseModel, EmailStr

from app.modules.users.schemas import ProfileOut


class RegisterIn(BaseModel):
    username: str
    email: EmailStr
    password: str
    name: str
    accept_tos: bool


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    user: ProfileOut
    token: str


class MeOut(BaseModel):
    user: ProfileOut


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str


class ChangeEmailIn(BaseModel):
    new_email: EmailStr
    password: str


class VerifyEmailIn(BaseModel):
    token: str


class OkOut(BaseModel):
    ok: bool = True
