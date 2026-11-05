/**
 * Un solo comando: `bun run dev`.
 * Levanta la API (con --watch) y Vite, y los apaga juntos.
 */

const api = Bun.spawn(["bun", "--watch", "server/index.ts"], {
  stdio: ["inherit", "inherit", "inherit"],
});

const vite = Bun.spawn(["bunx", "vite"], {
  stdio: ["inherit", "inherit", "inherit"],
});

const shutdown = () => {
  api.kill();
  vite.kill();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await Promise.race([api.exited, vite.exited]);
shutdown();
