import { loadJson, saveJson } from "./storage";

const AUTH_KEYS = {
  USERS: "AUTH_USERS_V1",
  CURRENT: "AUTH_CURRENT_USER_V1",
};

const DEMO_USER = {
  username: "demo",
  password: "demo1234",
  name: "데모 계정",
  email: "demo@example.com",
  createdAt: 0,
};

export async function getUsers() {
  const stored = (await loadJson(AUTH_KEYS.USERS)) || [];
  const exists = stored.some((u) => u.username === DEMO_USER.username);

  if (exists) return stored;

  const seeded = [...stored, DEMO_USER];
  await saveJson(AUTH_KEYS.USERS, seeded);
  return seeded;
}

export async function registerUser({ username, password, name, email }) {
  const trimmedId = (username || "").trim();
  const trimmedName = (name || "").trim();
  const trimmedEmail = (email || "").trim();

  if (!trimmedId || !password) {
    throw new Error("아이디와 비밀번호를 입력하세요.");
  }

  const users = await getUsers();
  if (users.some((u) => u.username === trimmedId)) {
    throw new Error("이미 사용 중인 아이디입니다.");
  }

  const user = {
    username: trimmedId,
    password,
    name: trimmedName || trimmedId,
    email: trimmedEmail,
    createdAt: Date.now(),
  };

  await saveJson(AUTH_KEYS.USERS, [...users, user]);
  await saveJson(AUTH_KEYS.CURRENT, user);
  return user;
}

export async function loginUser(username, password) {
  const users = await getUsers();
  const user = users.find((u) => u.username === (username || "").trim());
  if (!user) {
    throw new Error("등록되지 않은 계정입니다.");
  }
  if (user.password !== password) {
    throw new Error("비밀번호가 일치하지 않습니다.");
  }

  await saveJson(AUTH_KEYS.CURRENT, user);
  return user;
}

export async function logoutUser() {
  await saveJson(AUTH_KEYS.CURRENT, null);
}

export async function getCurrentUser() {
  return (await loadJson(AUTH_KEYS.CURRENT)) || null;
}

export async function resetPassword(username, nextPassword) {
  const users = await getUsers();
  const idx = users.findIndex((u) => u.username === (username || "").trim());
  if (idx < 0) throw new Error("일치하는 아이디가 없습니다.");
  if (!nextPassword) throw new Error("새 비밀번호를 입력하세요.");

  const updated = { ...users[idx], password: nextPassword };
  const nextUsers = [...users];
  nextUsers[idx] = updated;
  await saveJson(AUTH_KEYS.USERS, nextUsers);
  await saveJson(AUTH_KEYS.CURRENT, updated);
  return updated;
}

export async function findUsersByEmail(email) {
  const users = await getUsers();
  const target = (email || "").trim().toLowerCase();
  if (!target) return [];
  return users.filter((u) => (u.email || "").trim().toLowerCase() === target);
}
