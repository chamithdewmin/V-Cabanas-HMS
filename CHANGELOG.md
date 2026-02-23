# Changelog

All notable changes to MyAccounts will be documented in this file.

## [1.1.0] - 2025-02-15

### Added
- **Forgot Password** – Reset password via SMS OTP
  - Enter phone number (from Settings) to receive OTP
  - Verify OTP and set new password
  - Uses logozodev SMS gateway for delivery
- **SMS Page** – Gateway setup and bulk SMS to clients
- **Reminders** – Link reminders to income/expenses, "Remind by SMS"
- **Transfers** – Deposit cash to bank, withdraw from bank
- **Settings** – Phone number field for business contact
- **Users Page** – Admin-only (logozodev@gmail.com) user management

### Changed
- Login email is now case-insensitive
- Forgot password checks only Settings phone (not clients/customers)
- Improved error handling and validation messages

### Fixed
- 500 errors on forgot-password (table creation, DB resilience)
- Login 401 with correct credentials (case sensitivity)
- User delete cascade (reminders, related tables)

---

## [1.0.0] - Initial Release

- Login, Dashboard
- Income (POS), Expenses (Inventory)
- Invoices, Clients, Customers, Orders
- Reports, Cash Flow, Balance Sheet
- Settings, Assets, Loans, Cars
