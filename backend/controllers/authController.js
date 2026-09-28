import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { createMemoryUser, findMemoryUserByEmail, findMemoryUserById } from '../config/authStore.js';

function makeToken(user) {
  return jwt.sign({ sub: user.id, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
}
function safeUser(user) { return { id: user.id, name: user.name, email: user.email }; }
function useDatabase() { return Boolean(process.env.MONGODB_URI) && mongoose.connection.readyState === 1; }

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body || {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) return res.status(400).json({ message: 'Enter a name between 2 and 80 characters.' });
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Password must be between 8 and 128 characters.' });

    const normalizedEmail = email.trim().toLowerCase();
    if (useDatabase()) {
      if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: 'An account with that email already exists.' });
      const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12) });
      return res.status(201).json({ user: safeUser(user), token: makeToken(user) });
    }

    if (findMemoryUserByEmail(normalizedEmail)) return res.status(409).json({ message: 'An account with that email already exists.' });
    const user = createMemoryUser({ name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12) });
    return res.status(201).json({ user: safeUser(user), token: makeToken(user) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'An account with that email already exists.' });
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 128) return res.status(400).json({ message: 'Enter your email and password.' });

    const normalizedEmail = email.trim().toLowerCase();
    if (useDatabase()) {
      const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
      return res.json({ user: safeUser(user), token: makeToken(user) });
    }

    const user = findMemoryUserByEmail(normalizedEmail);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    return res.json({ user: safeUser(user), token: makeToken(user) });
  } catch (error) { return next(error); }
}

export async function me(req, res, next) {
  try {
    const user = useDatabase() ? await User.findById(req.user.sub) : findMemoryUserById(req.user.sub);
    if (!user) return res.status(401).json({ message: 'Account not found. Please sign in again.' });
    return res.json({ user: safeUser(user) });
  } catch (error) { return next(error); }
}
