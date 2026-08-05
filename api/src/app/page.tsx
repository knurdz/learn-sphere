import Image from "next/image";

export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: "40rem" }}>
      <Image src="/learnsphere-icon.png" alt="LearnSphere" width={72} height={72} style={{ borderRadius: 16 }} priority />
      <h1 style={{ marginTop: "1.25rem" }}>LearnSphere API</h1>
      <p>REST handlers live under <code>/api/*</code>. Use the Flutter app as the client.</p>
    </main>
  );
}
