import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  const wallet = req.query.wallet;

  if (!wallet) {
    return res.status(400).send("Wallet address is required");
  }

  try {
    const response = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [wallet]
      })
    });

    const data = await response.json();
    const balance = data.result?.value || 0;

    res.send(`Saldo: ${balance / 10 ** 9} SOL`);
  } catch (error) {
    res.status(500).send("Error al obtener el saldo");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});