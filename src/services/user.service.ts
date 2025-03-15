import { User } from "../models/user.model";

export class UserService {
  // In a real app, this would interact with a database
  public async getUserById(id: string): Promise<User | null> {
    // This is just mock data for the example
    const mockUser: User = {
      id,
      name: "John Doe",
      email: "john@example.com",
      createdAt: new Date(),
    };

    return mockUser;
  }
}
