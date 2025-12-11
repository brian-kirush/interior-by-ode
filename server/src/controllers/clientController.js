// Client controller
const pool = require('../config/database');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllClients = catchAsync(async (req, res, next) => {
  const result = await pool.query('SELECT * FROM clients ORDER BY name ASC');
  res.json({
    success: true,
    count: result.rows.length,
    data: result.rows
  });
});

exports.getClient = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    return next(new AppError('Client not found', 404));
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
});

exports.createClient = catchAsync(async (req, res, next) => {
  const { name, email, phone, address, company, notes } = req.body;
  const result = await pool.query(
    'INSERT INTO clients (name, email, phone, address, company, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [name, email, phone, address, company, notes]
  );

  res.status(201).json({
    success: true,
    message: 'Client created successfully',
    data: result.rows[0]
  });
});

exports.updateClient = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, email, phone, address, company, notes } = req.body;

  // Build the query dynamically to only update provided fields
  const fields = [];
  const values = [];
  let counter = 1;

  if (name !== undefined) { fields.push(`name = $${counter++}`); values.push(name); }
  if (email !== undefined) { fields.push(`email = $${counter++}`); values.push(email); }
  if (phone !== undefined) { fields.push(`phone = $${counter++}`); values.push(phone); }
  if (address !== undefined) { fields.push(`address = $${counter++}`); values.push(address); }
  if (company !== undefined) { fields.push(`company = $${counter++}`); values.push(company); }
  if (notes !== undefined) { fields.push(`notes = $${counter++}`); values.push(notes); }

  if (fields.length === 0) {
    return next(new AppError('No fields to update', 400));
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const query = `UPDATE clients SET ${fields.join(', ')} WHERE id = $${counter} RETURNING *`;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return next(new AppError('Client not found', 404));
  }

  res.json({
    success: true,
    message: 'Client updated successfully',
    data: result.rows[0]
  });
});

exports.deleteClient = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING *', [id]);

  if (result.rows.length === 0) {
    return next(new AppError('Client not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Client deleted successfully'
  });
});