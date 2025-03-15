import { Request, Response } from "express";
import { UserService } from "../services/user.service";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  public getUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.id;
      const user = await this.userService.getUserById(userId);

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  };
}
