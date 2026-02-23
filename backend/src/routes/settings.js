import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toSettings = (row) => {
  // Parse additional settings from JSONB if exists
  let additionalSettings = {};
  if (row.settings_json) {
    try {
      if (typeof row.settings_json === 'string') {
        additionalSettings = JSON.parse(row.settings_json);
      } else if (typeof row.settings_json === 'object') {
        additionalSettings = row.settings_json;
      }
    } catch (e) {
      // If parsing fails, use empty object
      additionalSettings = {};
    }
  }
  
  const base = {
    businessName: row.business_name || 'My Business',
    phone: row.phone ?? '',
    currency: row.currency || 'LKR',
    taxRate: parseFloat(row.tax_rate) || 10,
    taxEnabled: row.tax_enabled ?? true,
    theme: row.theme || 'dark',
    logo: row.logo,
    profileAvatar: row.profile_avatar || null,
    invoiceThemeColor: row.invoice_theme_color || '#F97316',
    openingCash: parseFloat(row.opening_cash) || 0,
    ownerCapital: parseFloat(row.owner_capital) || 0,
    payables: parseFloat(row.payables) || 0,
    expenseCategories: (() => {
      let cats = row.expense_categories;
      if (typeof cats === 'string') try { cats = JSON.parse(cats); } catch (_) { cats = null; }
      if (Array.isArray(cats) && cats.length > 0) return cats;
      return ['Hosting', 'Tools & Subscriptions', 'Advertising & Marketing', 'Transport', 'Office & Utilities', 'Personal Use', 'Rent', 'Salaries & Wages', 'Insurance', 'Software & Licenses', 'Travel', 'Meals & Entertainment', 'Supplies & Materials', 'Professional Services', 'Bank & Finance Charges', 'Other'];
    })(),
    // Additional settings from JSONB
    emailNotifications: additionalSettings.emailNotifications ?? false,
    smsNotifications: additionalSettings.smsNotifications ?? false,
    autoSave: additionalSettings.autoSave ?? false,
    showCurrencySymbol: additionalSettings.showCurrencySymbol ?? true,
    dateFormat: additionalSettings.dateFormat || 'DD/MM/YYYY',
    numberFormat: additionalSettings.numberFormat || '1,234.56',
    invoiceAutoNumbering: additionalSettings.invoiceAutoNumbering ?? false,
    autoExport: additionalSettings.autoExport ?? false,
    email: additionalSettings.email ?? '',
    address: additionalSettings.address ?? '',
    website: additionalSettings.website ?? '',
  };
  return base;
};

const hasPhoneColumn = async () => {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'phone'`
  );
  return rows.length > 0;
};

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const hasPhone = await hasPhoneColumn();
    
    // Build SELECT query to explicitly include phone if column exists
    let selectQuery = 'SELECT * FROM settings WHERE user_id = $1';
    const { rows } = await pool.query(selectQuery, [uid]);
    
    if (!rows[0]) {
      // Insert default settings
      if (hasPhone) {
        await pool.query(
          `INSERT INTO settings (user_id, business_name, phone) VALUES ($1, 'My Business', '')`,
          [uid]
        );
      } else {
        await pool.query(
          `INSERT INTO settings (user_id, business_name) VALUES ($1, 'My Business')`,
          [uid]
        );
      }
      const { rows: r } = await pool.query(selectQuery, [uid]);
      const row = r[0];
      // Ensure phone is always included in response
      if (!hasPhone) {
        row.phone = '';
      }
      return res.json(toSettings(row));
    }
    
    // Ensure phone is always included in response, even if column doesn't exist
    const row = rows[0];
    if (!hasPhone) {
      row.phone = '';
    } else if (row.phone == null) {
      // If column exists but value is null, set to empty string
      row.phone = '';
    }
    
    const settings = toSettings(row);
    res.json(settings);
  } catch (err) {
    console.error('[settings GET]', err.message, err.stack);
    res.status(500).json({ error: 'Server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

const hasProfileAvatarColumn = async () => {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'profile_avatar'`
  );
  return rows.length > 0;
};

const hasSettingsJsonColumn = async () => {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'settings_json'`
  );
  return rows.length > 0;
};

router.put('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const d = req.body;
    const usePhone = await hasPhoneColumn();
    const useProfileAvatar = await hasProfileAvatarColumn();
    const useSettingsJson = await hasSettingsJsonColumn();
    const expenseCategoriesJson = d.expenseCategories ? JSON.stringify(d.expenseCategories) : null;

    let existingJson = {};
    if (useSettingsJson) {
      const { rows } = await pool.query('SELECT settings_json FROM settings WHERE user_id = $1', [uid]);
      if (rows[0]?.settings_json) {
        try {
          existingJson = typeof rows[0].settings_json === 'string' ? JSON.parse(rows[0].settings_json) : (rows[0].settings_json || {});
        } catch (_) {}
      }
    }

    // Prepare additional settings JSONB (preserve existing email/address/website when not in body)
    const additionalSettings = {
      emailNotifications: d.emailNotifications ?? existingJson.emailNotifications ?? false,
      smsNotifications: d.smsNotifications ?? existingJson.smsNotifications ?? false,
      autoSave: d.autoSave ?? existingJson.autoSave ?? false,
      showCurrencySymbol: d.showCurrencySymbol ?? existingJson.showCurrencySymbol ?? true,
      dateFormat: d.dateFormat || existingJson.dateFormat || 'DD/MM/YYYY',
      numberFormat: d.numberFormat || existingJson.numberFormat || '1,234.56',
      invoiceAutoNumbering: d.invoiceAutoNumbering ?? existingJson.invoiceAutoNumbering ?? false,
      autoExport: d.autoExport ?? existingJson.autoExport ?? false,
      email: d.email !== undefined ? d.email : (existingJson.email ?? ''),
      address: d.address !== undefined ? d.address : (existingJson.address ?? ''),
      website: d.website !== undefined ? d.website : (existingJson.website ?? ''),
    };
    const settingsJson = useSettingsJson ? JSON.stringify(additionalSettings) : null;

    const invoiceThemeColor = (d.invoiceThemeColor || '#F97316').toString().trim().slice(0, 20);
    if (usePhone) {
      // Build params array and query parts dynamically
      const params = [];
      const updates = [];
      let paramIndex = 1;
      
      const addUpdate = (value, field) => {
        params.push(value);
        updates.push(`${field} = COALESCE($${paramIndex}, ${field})`);
        paramIndex++;
      };
      
      addUpdate(d.businessName, 'business_name');
      addUpdate(d.phone != null ? d.phone : '', 'phone');
      addUpdate(d.currency, 'currency');
      addUpdate(d.taxRate != null ? d.taxRate : null, 'tax_rate');
      addUpdate(d.taxEnabled, 'tax_enabled');
      addUpdate(d.theme, 'theme');
      addUpdate(d.logo, 'logo');
      
      if (useProfileAvatar) {
        addUpdate(d.profileAvatar, 'profile_avatar');
      }
      
      addUpdate(invoiceThemeColor, 'invoice_theme_color');
      addUpdate(d.openingCash, 'opening_cash');
      addUpdate(d.ownerCapital, 'owner_capital');
      addUpdate(d.payables, 'payables');
      addUpdate(expenseCategoriesJson, 'expense_categories');
      
      if (useSettingsJson) {
        addUpdate(settingsJson, 'settings_json');
      }
      
      params.push(uid);
      const userIdParam = paramIndex;
      
      const updateQuery = `UPDATE settings SET ${updates.join(', ')}, updated_at = NOW() WHERE user_id = $${userIdParam}`;
      const { rowCount } = await pool.query(updateQuery, params);
      if (rowCount === 0) {
        let insertFields = ['user_id', 'business_name', 'phone', 'currency', 'tax_rate', 'tax_enabled', 'theme', 'logo'];
        let insertValues = [uid, d.businessName || 'My Business', d.phone || '', d.currency || 'LKR', d.taxRate ?? 10, d.taxEnabled ?? true, d.theme || 'dark', d.logo];
        let valuePlaceholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7', '$8'];
        let placeholderIndex = 9;
        
        if (useProfileAvatar) {
          insertFields.push('profile_avatar');
          insertValues.push(d.profileAvatar || null);
          valuePlaceholders.push(`$${placeholderIndex}`);
          placeholderIndex++;
        }
        insertFields.push('invoice_theme_color', 'opening_cash', 'owner_capital', 'payables', 'expense_categories');
        insertValues.push(invoiceThemeColor, d.openingCash ?? 0, d.ownerCapital ?? 0, d.payables ?? 0, expenseCategoriesJson || '["Hosting","Tools & Subscriptions","Advertising & Marketing","Transport","Office & Utilities","Personal Use","Rent","Salaries & Wages","Insurance","Software & Licenses","Travel","Meals & Entertainment","Supplies & Materials","Professional Services","Bank & Finance Charges","Other"]');
        valuePlaceholders.push(`$${placeholderIndex}`, `$${placeholderIndex + 1}`, `$${placeholderIndex + 2}`, `$${placeholderIndex + 3}`, `$${placeholderIndex + 4}`);
        placeholderIndex += 5;
        
        if (useSettingsJson) {
          insertFields.push('settings_json');
          insertValues.push(settingsJson);
          valuePlaceholders.push(`$${placeholderIndex}`);
        }
        
        await pool.query(
          `INSERT INTO settings (${insertFields.join(', ')})
           VALUES (${valuePlaceholders.join(', ')})`,
          insertValues
        );
      }
    } else {
      // No phone column
      const params = [];
      const updates = [];
      let paramIndex = 1;
      
      const addUpdate = (value, field) => {
        params.push(value);
        updates.push(`${field} = COALESCE($${paramIndex}, ${field})`);
        paramIndex++;
      };
      
      addUpdate(d.businessName, 'business_name');
      addUpdate(d.currency, 'currency');
      addUpdate(d.taxRate != null ? d.taxRate : null, 'tax_rate');
      addUpdate(d.taxEnabled, 'tax_enabled');
      addUpdate(d.theme, 'theme');
      addUpdate(d.logo, 'logo');
      
      if (useProfileAvatar) {
        addUpdate(d.profileAvatar, 'profile_avatar');
      }
      
      addUpdate(invoiceThemeColor, 'invoice_theme_color');
      addUpdate(d.openingCash, 'opening_cash');
      addUpdate(d.ownerCapital, 'owner_capital');
      addUpdate(d.payables, 'payables');
      addUpdate(expenseCategoriesJson, 'expense_categories');
      
      if (useSettingsJson) {
        addUpdate(settingsJson, 'settings_json');
      }
      
      params.push(uid);
      const userIdParam = paramIndex;
      
      const updateQuery = `UPDATE settings SET ${updates.join(', ')}, updated_at = NOW() WHERE user_id = $${userIdParam}`;
      const { rowCount } = await pool.query(updateQuery, params);
      if (rowCount === 0) {
        let insertFields = ['user_id', 'business_name', 'currency', 'tax_rate', 'tax_enabled', 'theme', 'logo'];
        let insertValues = [uid, d.businessName || 'My Business', d.currency || 'LKR', d.taxRate ?? 10, d.taxEnabled ?? true, d.theme || 'dark', d.logo];
        let valuePlaceholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7'];
        let placeholderIndex = 8;
        
        if (useProfileAvatar) {
          insertFields.push('profile_avatar');
          insertValues.push(d.profileAvatar || null);
          valuePlaceholders.push(`$${placeholderIndex}`);
          placeholderIndex++;
        }
        insertFields.push('invoice_theme_color', 'opening_cash', 'owner_capital', 'payables', 'expense_categories');
        insertValues.push(invoiceThemeColor, d.openingCash ?? 0, d.ownerCapital ?? 0, d.payables ?? 0, expenseCategoriesJson || '["Hosting","Tools & Subscriptions","Advertising & Marketing","Transport","Office & Utilities","Personal Use","Rent","Salaries & Wages","Insurance","Software & Licenses","Travel","Meals & Entertainment","Supplies & Materials","Professional Services","Bank & Finance Charges","Other"]');
        valuePlaceholders.push(`$${placeholderIndex}`, `$${placeholderIndex + 1}`, `$${placeholderIndex + 2}`, `$${placeholderIndex + 3}`, `$${placeholderIndex + 4}`);
        placeholderIndex += 5;
        
        if (useSettingsJson) {
          insertFields.push('settings_json');
          insertValues.push(settingsJson);
          valuePlaceholders.push(`$${placeholderIndex}`);
        }
        
        await pool.query(
          `INSERT INTO settings (${insertFields.join(', ')})
           VALUES (${valuePlaceholders.join(', ')})`,
          insertValues
        );
      }
    }
    const { rows } = await pool.query('SELECT * FROM settings WHERE user_id = $1', [uid]);
    if (!rows[0]) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    const settings = toSettings(rows[0]);
    res.json(settings);
  } catch (err) {
    console.error('[settings PUT]', err.message, err.stack);
    res.status(500).json({ error: 'Server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

export default router;
