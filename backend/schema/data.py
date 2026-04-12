from pydantic import BaseModel


class URLRequest(BaseModel):
    url: str


class EmailRequest(BaseModel):
    text: str


class ImageRequest(BaseModel):
    image: str  # base64 encoded image