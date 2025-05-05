const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/balance', async (req, res) => {
  try {
    const { address } = req.body;

    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address]
      })
    });

    const data = await response.json();
    const balance = data.result?.value / 1e9 || 0;

    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo saldo' });
  }
});

app.listen(PORT, () => console.log(`Servidor API activo en puerto ${PORT}`));
