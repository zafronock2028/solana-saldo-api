<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Consulta tu saldo en Solana</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', sans-serif;
      background: #000;
      color: #fff;
      height: 100%;
      overflow: hidden;
    }

    canvas {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 0;
    }

    .contenido {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      min-height: 100vh;
      box-sizing: border-box;
      text-align: center;
    }

    .logo {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #00ffa3;
      margin-bottom: 10px;
    }

    .brand {
      font-size: 1rem;
      font-weight: bold;
      background: linear-gradient(90deg, #00ffa3, #dc1fff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 20px;
    }

    h1 {
      font-size: 2rem;
      background: linear-gradient(90deg, #00ffa3, #dc1fff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 10px 0 20px;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 15px;
      width: 100%;
      max-width: 400px;
      margin-bottom: 30px;
    }

    input {
      padding: 14px;
      font-size: 1rem;
      border-radius: 8px;
      border: none;
      outline: none;
      width: 100%;
    }

    button {
      padding: 14px;
      font-size: 1rem;
      font-weight: bold;
      color: #000;
      border: none;
      border-radius: 8px;
      background: linear-gradient(90deg, #00ffa3, #dc1fff);
      cursor: pointer;
      transition: opacity 0.3s;
    }

    button:hover {
      opacity: 0.85;
    }

    #resultado {
      font-size: 1.4rem;
      color: #00ffa3;
      text-shadow: 0 0 10px #00ffa3;
      min-height: 30px;
    }

    footer {
      margin-top: auto;
      font-size: 0.9rem;
      color: #aaa;
      padding-top: 20px;
    }

    footer a {
      color: #dc1fff;
      text-decoration: none;
    }

    @media (max-width: 600px) {
      h1 {
        font-size: 1.5rem;
      }
    }
  </style>
</head>
<body>
  <canvas id="fondo"></canvas>

  <div class="contenido">
    <img src="/logo.png" alt="Logo de Zafronock" class="logo" />
    <div class="brand">By Zafronock</div>

    <h1>Consulta tu saldo en Solana</h1>

    <form id="form">
      <input type="text" id="wallet" placeholder="Ingresa tu wallet de Solana" required />
      <button type="submit">Consultar</button>
    </form>

    <p id="resultado"></p>

    <footer>
      Únete al canal de Telegram: <a href="https://t.me/Zafronockbitfratsg" target="_blank">@Zafronockbitfratsg</a>
    </footer>
  </div>

  <script>
    // Script de consulta
    const form = document.getElementById('form');
    const resultado = document.getElementById('resultado');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const wallet = document.getElementById('wallet').value;
      resultado.innerText = 'Consultando...';
      try {
        const res = await fetch(`/saldo?wallet=${wallet}`);
        const text = await res.text();
        resultado.innerText = text;
      } catch (err) {
        resultado.innerText = 'Error al consultar el saldo';
      }
    });

    // Fondo de galaxia animado
    const canvas = document.getElementById('fondo');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];

    function crearParticulas() {
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.8 + 0.5,
          dx: (Math.random() - 0.5) * 0.4,
          dy: (Math.random() - 0.5) * 0.4
        });
      }
    }

    function animar() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#00ffa3';
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      requestAnimationFrame(animar);
    }

    crearParticulas();
    animar();
  </script>
</body>
</html>