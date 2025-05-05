import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// Para poder usar __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, "public")));

app.get("/", async (req, res) => {
  const wallet = req.query.wallet;

  if (!wallet) {
    return res.sendFile(path.join(__dirname, "public", "index.html"));
  }

  try {
    const response = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [wallet],
      }),
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