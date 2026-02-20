import express, { Express, Request, Response } from "express";
import { env, validateEnv } from "./config";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import path from "path";

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

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "../public")));

app.use("/health", healthRoutes);
app.use("/twilio", twilioRoutes);

// WebSocket handling
wss.on("connection", twilioController.handleWebSocketConnection);

// Basic route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from TypeScript Express Server!" });
});

// Add route for test interface when in development
if (process.env.NODE_ENV === "development") {
  app.get("/test", (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "../public/test-interface.html"));
  });
}

server.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

export default app;
