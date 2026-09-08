# MSWG Pre-Voting

Frontend for MSWG pre-voting: retrieve a Bursa announcement, record ordinary-resolution votes, and review submission history.

## Run locally
To run the API server, use the following command in the terminal:

[python -m uvicorn api:app --reload --port 8000] backend folder to run the API server
[python -m http.server 8080] in the main folder to run the front-end server

http://127.0.0.1:8000/docs to test all the paths in the API server

Open [http://localhost:8080/PRE-VOTING/frontend/index.html]

## Project layout

| Path | Purpose |
|------|---------|
| `index.html` | Pre-voting form |
| `history.html` | History list + detail |
| `history.css` | History + detail layout (border + grid fixes) |
| `index.css` | Shared theme, sidebar, topbar, form styles |
| `history.js` | History list/detail behaviour |
| `prevoting.js` | Bursa retrieve + voting form |
| `nav.js` | Shared navigation sidebar and topbar |
