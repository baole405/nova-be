import { Controller, Get, Header } from '@nestjs/common';

@Controller()
export class RootController {
  @Get('/')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getLandingPage(): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NOVA Backend</title>
    <style>
      :root {
        color-scheme: light;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background: radial-gradient(circle at 20% 20%, #edf6ff 0, #f8fbff 40%, #ffffff 100%);
        color: #0f172a;
      }

      .card {
        width: min(92vw, 560px);
        background: #ffffff;
        border: 1px solid #dbeafe;
        border-radius: 16px;
        padding: 28px;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        text-align: center;
      }

      h1 {
        margin: 0 0 10px;
        font-size: 32px;
        color: #0b3b8c;
      }

      p {
        margin: 0 0 20px;
        color: #334155;
      }

      a {
        display: inline-block;
        text-decoration: none;
        font-weight: 600;
        background: #0b5ed7;
        color: #ffffff;
        padding: 12px 18px;
        border-radius: 10px;
      }

      a:hover {
        background: #094fb5;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Hello World</h1>
      <p>NOVA Backend is running. Open Swagger to test APIs.</p>
      <a href="/api/docs">Go to Swagger Docs</a>
    </main>
  </body>
</html>`;
  }
}
