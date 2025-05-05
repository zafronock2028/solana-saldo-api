import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivos estáticos desde "public"
app.use(express.static(path.join(__dirname, "public")));

// Ruta principal: HTML de la web
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Ruta para consultar saldo manualmente
app.get("/saldo", async (req, res) => {
  const wallet = req.query.wallet;
  if (!wallet) return res.status(400).send("Falta la dirección de wallet");

  try {
    const response = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [wallet],
      }),
    });

    const data = await response.json();
    const balance = data.result?.value || 0;
    res.send(`Saldo: ${balance / 1e9} SOL`);
  } catch (error) {
    res.status(500).send("Error al obtener el saldo");
  }
});

// Ruta privada para el bot (solo tu wallet)
app.get("/saldo-bot", async (req, res) => {
  const wallet = "5ib3PB5jfq65HCiWBwfZcyK3LhZ9bXB3nQ2HcvanxvLD";

  try {
    const response = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [wallet],
      }),
    });

    const data = await response.json();
    const balance = data.result?.value || 0;
    res.send({ sol: balance / 1e9 });
  } catch (error) {
    res.status(500).send({ error: "No se pudo obtener el saldo." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});