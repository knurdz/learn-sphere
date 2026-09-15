export function requiredServerEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error("Missing server environment variable: " + name);
  }
  return value;
}

export function firstDefinedServerEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error("Missing server environment variable: " + names.join(" or "));
}
