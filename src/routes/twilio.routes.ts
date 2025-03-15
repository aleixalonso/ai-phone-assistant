import { Router } from "express";
import { TwilioController } from "../controllers";

const router = Router();
const twilioController = new TwilioController();

router.post("/incoming", twilioController.handleIncomingCall);

export default router;
