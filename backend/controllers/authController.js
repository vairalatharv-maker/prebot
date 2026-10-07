import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../config/supabase.js';

function makeToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

function requireDatabase(res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    res.status(503).json({
      message:
        'Account storage is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in backend/.env and restart the API.',
    });
    return false;
  }

  return true;
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== 'string' ||
      name.trim().length < 2 ||
      name.trim().length > 80
    ) {
      return res
        .status(400)
        .json({ message: 'Enter a name between 2 and 80 characters.' });
    }

    if (
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254
    ) {
      return res
        .status(400)
        .json({ message: 'Enter a valid email address.' });
    }

    if (
      typeof password !== 'string' ||
      password.length < 8 ||
      password.length > 128
    ) {
      return res.status(400).json({
        message: 'Password must be between 8 and 128 characters.',
      });
    }

    if (!requireDatabase(res)) return;

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (findError) {
      console.error('Supabase user lookup error:', findError);
      return res.status(500).json({
        message: 'Could not check account. Please try again.',
      });
    }

    if (existingUser) {
      return res.status(409).json({
        message:
          'An account with that email already exists. Sign in instead.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
      })
      .select('id, name, email')
      .single();

    if (insertError) {
      console.error('Supabase user insert error:', insertError);

      return res.status(500).json({
        message: 'Could not create account. Please try again.',
      });
    }

    return res.status(201).json({
      user: safeUser(user),
      token: makeToken(user),
    });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      email.length > 254 ||
      password.length > 128
    ) {
      return res.status(400).json({
        message: 'Enter your email and password.',
      });
    }

    if (!requireDatabase(res)) return;

    const normalizedEmail = email.trim().toLowerCase();

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, password_hash')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('Supabase login error:', error);

      return res.status(500).json({
        message: 'Could not sign in. Please try again.',
      });
    }

    if (
      !user ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({
        message: 'Email or password is incorrect.',
      });
    }

    return res.json({
      user: safeUser(user),
      token: makeToken(user),
    });
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res, next) {
  try {
    if (!requireDatabase(res)) return;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', req.user.sub)
      .maybeSingle();

    if (error) {
      console.error('Supabase profile lookup error:', error);

      return res.status(500).json({
        message: 'Could not load account.',
      });
    }

    if (!user) {
      return res.status(401).json({
        message: 'Account not found. Please sign in again.',
      });
    }

    return res.json({
      user: safeUser(user),
    });
  } catch (error) {
    return next(error);
  }
}