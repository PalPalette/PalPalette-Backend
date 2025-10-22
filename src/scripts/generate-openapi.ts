import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import * as fs from "fs";
import * as path from "path";
import metadata from "../metadata";

async function generateOpenApiSpec() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

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

  await SwaggerModule.loadPluginMetadata(metadata);
  const document = SwaggerModule.createDocument(app, config);

  const outputPath = path.resolve(__dirname, "../../openapi.json");
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`✅ OpenAPI specification generated at: ${outputPath}`);
  console.log(`📄 Use this file to generate frontend code`);

  await app.close();
  process.exit(0);
}

generateOpenApiSpec().catch((error) => {
  console.error("❌ Failed to generate OpenAPI spec:", error);
  process.exit(1);
});
