import { FakeStoreProductProvider } from "./adapters/fake-store-product-provider.js";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { CatalogueService } from "./services/catalogue-service.js";

const config = loadConfig();
const productProvider = new FakeStoreProductProvider({
  baseUrl: config.fakeStoreBaseUrl,
  timeoutMs: config.fakeStoreTimeoutMs,
});
const catalogueService = new CatalogueService(productProvider, config.featuredProductIds);
const app = createApp({ catalogueService });

const server = app.listen(config.port, config.host, () => {
  console.info(`ProductsBackend listening at http://${config.host}:${config.port}`);
});

server.on("error", (error: Error) => {
  console.error("Failed to start ProductsBackend", error);
  process.exitCode = 1;
});
