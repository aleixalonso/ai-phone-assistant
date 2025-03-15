import { Router } from "express";
import { UserController } from "../controllers";

const router = Router();
const userController = new UserController();

// GET /users/:id
router.get("/:id", userController.getUser);

export default router;
