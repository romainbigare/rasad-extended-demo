// Function to get a value from session storage
const getSessionStorageItem = (key: string) => {
  const value = sessionStorage.getItem(key);
  return value ? JSON.parse(value) : null;
};

// Function to set a value in session storage
const setSessionStorageItem = (key: string, value: any) => {
  sessionStorage.setItem(key, JSON.stringify(value));
};

// Function to delete a specific item from session storage
const deleteSessionStorageItem = (key: string) => {
  sessionStorage.removeItem(key);
};

// Function to delete all items from session storage
const clearSessionStorage = () => {
  sessionStorage.clear();
};

export {
  getSessionStorageItem,
  setSessionStorageItem,
  deleteSessionStorageItem,
  clearSessionStorage,
};
