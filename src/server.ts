import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = createApp();

const server = app.listen(config.port, config.host, () => {
  console.info(`ProductsBackend listening at http://${config.host}:${config.port}`);
});

server.on("error", (error: Error) => {
  console.error("Failed to start ProductsBackend", error);
  process.exitCode = 1;
});
