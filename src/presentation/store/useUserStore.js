import { create } from 'zustand';
import { GetUsers } from '../../domain/use-cases/GetUsers';
import { UserRepositoryImpl } from '../../data/repositories-impl/UserRepositoryImpl';

// Instantiate the repository implementation and use cases
const userRepository = new UserRepositoryImpl();
const getUsersUseCase = new GetUsers(userRepository);

export const useUserStore = create((set) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const users = await getUsersUseCase.execute();
      set({ users, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },
}));
