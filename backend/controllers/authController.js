import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../config/supabase.js';
import {
  createMemoryUser,
  findMemoryUserByEmail,
  findMemoryUserById,
} from '../config/authStore.js';

const JWT_SECRET = process.env.JWT_SECRET || 'prepbot-jwt-secret-key-production-fallback';

function makeToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
    },
    JWT_SECRET,
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

const isSupabaseConfigured = () => Boolean(supabase);

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

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    // Try Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const { data: existingUser, error: findError } = await supabase
          .from('users')
          .select('id')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (existingUser) {
          return res.status(409).json({
            message: 'An account with that email already exists. Sign in instead.',
          });
        }

        if (!findError) {
          const { data: user, error: insertError } = await supabase
            .from('users')
            .insert({
              name: name.trim(),
              email: normalizedEmail,
              password_hash: passwordHash,
            })
            .select('id, name, email')
            .single();

          if (!insertError && user) {
            return res.status(201).json({
              user: safeUser(user),
              token: makeToken(user),
            });
          }
        }
        console.warn('Supabase store unavailable, falling back to in-memory store.');
      } catch (err) {
        console.warn('Supabase register error, falling back to in-memory store:', err.message);
      }
    }

    // In-memory fallback
    if (findMemoryUserByEmail(normalizedEmail)) {
      return res.status(409).json({
        message: 'An account with that email already exists. Sign in instead.',
      });
    }

    const user = createMemoryUser({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

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

    const normalizedEmail = email.trim().toLowerCase();

    // Try Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const { data: user, error } = await supabase
          .from('users')
          .select('id, name, email, password_hash')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (!error && user) {
          const isValid = await bcrypt.compare(password, user.password_hash);
          if (!isValid) {
            return res.status(401).json({
              message: 'Email or password is incorrect.',
            });
          }
          return res.json({
            user: safeUser(user),
            token: makeToken(user),
          });
        }
      } catch (err) {
        console.warn('Supabase login check error, checking memory store:', err.message);
      }
    }

    // In-memory check
    const memUser = findMemoryUserByEmail(normalizedEmail);
    if (memUser && (await bcrypt.compare(password, memUser.passwordHash))) {
      return res.json({
        user: safeUser(memUser),
        token: makeToken(memUser),
      });
    }

    return res.status(401).json({
      message: 'Email or password is incorrect. If you have not created an account yet, please register.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res, next) {
  try {
    if (isSupabaseConfigured()) {
      try {
        const { data: user, error } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', req.user.sub)
          .maybeSingle();

        if (!error && user) {
          return res.json({
            user: safeUser(user),
          });
        }
      } catch (err) {
        console.warn('Supabase me error, checking memory store:', err.message);
      }
    }

    const memUser = findMemoryUserById(req.user.sub);
    if (memUser) {
      return res.json({
        user: safeUser(memUser),
      });
    }

    return res.status(401).json({
      message: 'Account not found. Please sign in again.',
    });
  } catch (error) {
    return next(error);
  }
}