from pathlib import Path

from litestar import Litestar, MediaType, Request, get
from litestar.response import Redirect, Response

BASE_PATH = Path(".")
BASE_URL = "https://github.com/LeoCx1000/AMQScripts/raw/master/"


@get("/{path:path}")
async def get_song(request: Request, path: str) -> Response:
    file = BASE_PATH / path.removeprefix("/")
    if not file.exists():
        return Redirect("/")

    return Response(
        content=file.read_text(encoding="utf-8").replace(
            BASE_URL, str(request.base_url)
        )
    )


@get("/", media_type=MediaType.HTML)
async def main_page() -> str:
    scripts = []
    for file in (BASE_PATH / "scripts").iterdir():
        if file.name.endswith(".user.js"):
            scripts.append(f"<p><a href=/scripts/{file.name}>{file.name}</a></p>")

    return f"""
    <html>
        <head>
            <style>
            body {{
                background-color: black;
                color: white;
                height: 95vh;
                width: 95vw;
                display: flex;
                justify-content: center;
                align-items: center;
                text-align: center;
            }}
            a {{
                color: deepskyblue;
            }}
            a:hover {{
                color: mediumslateblue;
            }}
            </style>
        </head>
        <body>
            <div>
                {"\n".join(scripts)}
            </div>
        </body>
    </html>    
    """


app = Litestar(route_handlers=[get_song, main_page], debug=True)
