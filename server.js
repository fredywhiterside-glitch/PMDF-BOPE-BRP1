// server.js
import { WebSocketServer } from "ws";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Configuração de caminho
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servidor HTTP para servir o frontend
const server = http.createServer((req, res) => {
  const filePath =
    req.url === "/" ? path.join(__dirname, "build/v39/index.html") : path.join(__dirname, "build/v39", req.url);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      // Se o arquivo não existir, volta para o index.html
      res.writeHead(200, { "Content-Type": "text/html" });
      fs.createReadStream(path.join(__dirname, "build/v39/index.html")).pipe(res);
    } else {
      const ext = path.extname(filePath);
      const type =
        ext === ".html"
          ? "text/html"
          : ext === ".js"
          ? "application/javascript"
          : ext === ".css"
          ? "text/css"
          : ext === ".png"
          ? "image/png"
          : "application/octet-stream";

      res.writeHead(200, { "Content-Type": type });
      res.end(content);
    }
  });
});

// Criação do servidor WebSocket
const wss = new WebSocketServer({ server });

// Contador de conexões
let conexoesAtivas = 0;

wss.on("connection", (ws) => {
  conexoesAtivas++;
  console.log(`🟢 Novo cliente conectado | Total: ${conexoesAtivas}`);
  ws.send("Conectado ao servidor em tempo real");

  // Quando o cliente envia uma mensagem
  ws.on("message", (msg) => {
    console.log("📩 Mensagem recebida:", msg.toString());

    // Reenvia a mensagem para todos os clientes conectados
    wss.clients.forEach((client) => {
      if (client.readyState === ws.OPEN) {
        client.send(msg.toString());
      }
    });
  });

  // Quando o cliente desconecta
  ws.on("close", () => {
    conexoesAtivas--;
    console.log(`🔴 Cliente desconectado | Restam: ${conexoesAtivas}`);
  });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));
