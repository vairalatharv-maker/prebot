const memoryUsers = new Map();

export { memoryUsers };

export function createMemoryUser({ id = crypto.randomUUID(), name, email, passwordHash }) {
  const user = { id, name, email, passwordHash };
  memoryUsers.set(id, user);
  memoryUsers.set(email.toLowerCase(), user);
  return user;
}

export function findMemoryUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  const user = memoryUsers.get(normalized);
  return user && user.email === normalized ? user : null;
}

export function findMemoryUserById(id) {
  return memoryUsers.get(id) || null;
}
