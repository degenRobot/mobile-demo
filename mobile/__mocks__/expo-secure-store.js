const store = new Map();

export const SecureStore = {
  getItemAsync: jest.fn(async (key) => {
    return store.get(key) || null;
  }),
  
  setItemAsync: jest.fn(async (key, value) => {
    store.set(key, value);
  }),
  
  deleteItemAsync: jest.fn(async (key) => {
    store.delete(key);
  }),
  
  // Test helper to set initial values
  __setMockData: (data) => {
    store.clear();
    Object.entries(data).forEach(([key, value]) => {
      store.set(key, value);
    });
  },
  
  // Test helper to clear store
  __clear: () => {
    store.clear();
  }
};

export default SecureStore;