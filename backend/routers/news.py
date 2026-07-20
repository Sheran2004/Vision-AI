from fastapi import APIRouter
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

class NewsRequest(BaseModel):
    category: str = "technology"
    query: str = ""

@router.get("/news")
async def get_news(category: str = "technology", query: str = ""):
    api_key = os.getenv("NEWS_API_KEY")
    
    try:
        async with httpx.AsyncClient() as client:
            if query:
                url = f"https://newsapi.org/v2/everything?q={query}&sortBy=publishedAt&pageSize=10&apiKey={api_key}"
            else:
                url = f"https://newsapi.org/v2/top-headlines?category={category}&pageSize=10&language=en&apiKey={api_key}"
            
            res = await client.get(url)
            data = res.json()
            
            articles = []
            for a in data.get("articles", []):
                articles.append({
                    "title": a["title"],
                    "description": a.get("description", ""),
                    "url": a["url"],
                    "source": a["source"]["name"],
                    "publishedAt": a["publishedAt"],
                    "urlToImage": a.get("urlToImage", "")
                })
            
            return {"articles": articles}
    except Exception as e:
        return {"error": str(e)}