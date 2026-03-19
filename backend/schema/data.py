from pydantic import BaseModel

# Request Models
class URLRequest(BaseModel):
    url: str

class EmailRequest(BaseModel):
    text: str