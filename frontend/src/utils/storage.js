export const getStorageData = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

export const setStorageData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
};

export const removeStorageData = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing ${key} from localStorage:`, error);
  }
};

export const resetDemoData = () => {
  // Clear financial data used by FinanceContext
  removeStorageData('finance_incomes');
  removeStorageData('finance_expenses');
  removeStorageData('finance_clients');
  removeStorageData('finance_invoices');
  removeStorageData('finance_settings');
  removeStorageData('finance_assets');
  removeStorageData('finance_loans');

  return {};
};