from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import Groq
from tavily import TavilyClient
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

class SearchRequest(BaseModel):
    query: str

@router.post("/search")
async def web_search(req: SearchRequest):
    try:
        results = tavily_client.search(req.query, max_results=5)
        
        context = ""
        sources = []
        for r in results["results"]:
            context += f"Title: {r['title']}\nContent: {r['content']}\nURL: {r['url']}\n\n"
            sources.append({"title": r["title"], "url": r["url"]})

        def generate():
            try:
                stream = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{
                        "role": "system",
                        "content": "You are a helpful AI assistant. Answer based on the search results provided. Be concise and accurate."
                    }, {
                        "role": "user",
                        "content": f"Search Query: {req.query}\n\nSearch Results:\n{context}\n\nProvide a comprehensive answer based on these results."
                    }],
                    stream=True
                )
                for chunk in stream:
                    delta = chunk.choices[0].delta.content
                    if delta:
                        yield delta
            except Exception as e:
                yield f"❌ Error: {str(e)}"

        return StreamingResponse(generate(), media_type="text/plain", headers={"X-Sources": str(sources)})
    
    except Exception as e:
        return {"error": str(e)}