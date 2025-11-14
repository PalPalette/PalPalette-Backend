import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import * as dotenv from "dotenv";
import metadata from "./metadata";
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable default body parser
  });

  app.enableCors({
    origin: [
      "http://localhost",
      "http://localhost:8100", // Ionic dev server
      "capacitor://localhost", // Capacitor iOS
      "ionic://localhost", // Alternative Capacitor iOS
      "https://localhost", // HTTPS localhost
      "https://cides06.gm.fh-koeln.de", // Your production domain
      process.env.CORS_ORIGIN || "*",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["*"], // for testing, be generous
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
    .addTag(
      "Push Notifications",
      "Push notification token registration and management"
    )
    .build();

  await SwaggerModule.loadPluginMetadata(metadata); // <-- here
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  // Listen on all interfaces (0.0.0.0) so external devices can connect
  await app.listen(3000, "0.0.0.0");

  console.log("Backend server started on http://0.0.0.0:3000");
  console.log("OpenAPI documentation available at http://0.0.0.0:3000/api");
  console.log("WebSocket server available for edge devices");
}
bootstrap();
