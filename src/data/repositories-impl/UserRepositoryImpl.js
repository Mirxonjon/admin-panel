import { User } from '../../domain/entities/User';

export class UserRepositoryImpl {
  async getUsers() {
    // Mocking an API call with a delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const users = [
          new User({ id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active', lastActive: '2 hours ago' }),
          new User({ id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Inactive', lastActive: '1 day ago' }),
          new User({ id: 3, name: 'Bob Wilson', email: 'bob@example.com', role: 'Editor', status: 'Active', lastActive: '5 mins ago' }),
        ];
        resolve(users);
      }, 800);
    });
  }
}
