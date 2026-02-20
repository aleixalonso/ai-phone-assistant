import express, { Express, Request, Response } from "express";
import { env, validateEnv } from "./config";
import { createServer } from "http";
import { WebSocketServer } from "ws";

import { healthRoutes, twilioRoutes } from "./routes";
import { TwilioController } from "./controllers";

// Validate environment variables before starting the app
validateEnv();

const app: Express = express();
const port = env.PORT; // Use the typed environment variable instead of process.env directly

const server = createServer(app);
const wss = new WebSocketServer({ server });
const twilioController = new TwilioController();

// Middleware for parsing JSON bodies
app.use(express.json());

app.use("/health", healthRoutes);
app.use("/twilio", twilioRoutes);

// WebSocket handling
wss.on("connection", twilioController.handleWebSocketConnection);

// Basic route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from TypeScript Express Server!" });
});

server.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

export default app;
