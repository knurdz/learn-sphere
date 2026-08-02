export function requiredServerEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error("Missing server environment variable: " + name);
  }
  return value;
}
