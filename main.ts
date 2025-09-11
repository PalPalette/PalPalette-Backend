import { NestFactory } from "@nestjs/core";
import { AppModule } from "./src/app.module";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AllExceptionsFilter } from "./src/common/filters/all-exceptions.filter";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import metadata from "src/metadata";
dotenv.config();

async function bootstrap() {
  const port = parseInt(process.env.PORT) || 3000;
  const httpsEnabled = process.env.HTTPS_ENABLED === 'true';
  
  let httpsOptions = null;
  
  // Configure HTTPS if enabled and certificates exist
  if (httpsEnabled) {
    const certPath = process.env.SSL_CERT_PATH || 'ssl/certificate.pem';
    const keyPath = process.env.SSL_KEY_PATH || 'ssl/private-key.pem';
    
    try {
      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        httpsOptions = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        };
        console.log("✅ HTTPS certificates loaded successfully");
      } else {
        console.log("⚠️  HTTPS enabled but certificates not found at:");
        console.log(`   Certificate: ${path.resolve(certPath)}`);
        console.log(`   Private Key: ${path.resolve(keyPath)}`);
        console.log("   Run 'npm run generate-ssl-cert' to generate development certificates");
        console.log("   Falling back to HTTP mode");
      }
    } catch (error) {
      console.error("❌ Error loading HTTPS certificates:", error.message);
      console.log("   Falling back to HTTP mode");
    }
  }

  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable default body parser
    httpsOptions, // Will be null for HTTP, or contain SSL options for HTTPS
  });

  // Configure global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Configure validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Configure custom body parser with larger limits
  const express = require("express");
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Enable CORS for frontend communication and WebSocket connections
  app.enableCors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://cides06.gm.fh-koeln.de",
      "https://cides06.gm.fh-koeln.de",
      "https://localhost:5173",
      "https://localhost:5174",
      "https://localhost:3000",
      "*",
    ], // Allow all origins for WebSocket testing
    credentials: true,
  });

  // Setup Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle("PalPalette API")
    .setDescription(
      "API for PalPalette color sharing and device management system"
    )
    .setVersion("1.0")
    .addBearerAuth({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      description: "Enter your JWT token",
    })
    .addTag("Authentication", "User and device authentication endpoints")
    .addTag("Users", "User management and social features")
    .addTag("Devices", "Device registration, pairing and management")
    .addTag("Messages", "Real-time messaging and color palette sharing")
    .build();

  await SwaggerModule.loadPluginMetadata(metadata); // <-- here
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  // Listen on all interfaces (0.0.0.0) so external devices can connect
  await app.listen(port, "0.0.0.0");

  const protocol = httpsOptions ? 'https' : 'http';
  console.log(`🚀 Backend server started on ${protocol}://0.0.0.0:${port}`);
  console.log(`📚 OpenAPI documentation available at ${protocol}://0.0.0.0:${port}/api`);
  console.log("🔌 WebSocket server available for edge devices");
  
  if (httpsOptions) {
    console.log("🔒 HTTPS mode: SSL/TLS encryption enabled");
  } else {
    console.log("🔓 HTTP mode: Consider enabling HTTPS for production");
  }
}
bootstrap();
