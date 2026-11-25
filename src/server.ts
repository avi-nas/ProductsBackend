import { FakeStoreProductProvider } from "./adapters/fake-store-product-provider.js";
import { SMTPEmailProvider } from "./adapters/smtp-email-provider.js";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { CatalogueService } from "./services/catalogue-service.js";
import { EnquiryService } from "./services/enquiry-service.js";

const config = loadConfig();
const productProvider = new FakeStoreProductProvider({
  baseUrl: config.fakeStoreBaseUrl,
  timeoutMs: config.fakeStoreTimeoutMs,
});
const catalogueService = new CatalogueService(productProvider, config.featuredProductIds);
const emailProvider = new SMTPEmailProvider({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpSecure,
  ...(config.smtpUser && config.smtpPassword
    ? { user: config.smtpUser, password: config.smtpPassword }
    : {}),
  from: config.smtpFrom,
  to: config.salesEmail,
});
const enquiryService = new EnquiryService(productProvider, emailProvider);
const app = createApp({ catalogueService, enquiryService });

const server = app.listen(config.port, config.host, () => {
  console.info(`ProductsBackend listening at http://${config.host}:${config.port}`);
});

server.on("error", (error: Error) => {
  console.error("Failed to start ProductsBackend", error);
  process.exitCode = 1;
});
