import { plainToClass } from "class-transformer";
import { validateSync } from "class-validator";
import { EnvironmentVariables } from "./environment.validation";

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => Object.values(error.constraints || {}).join(", "))
      .join("; ");

    throw new Error(`Environment validation failed: ${errorMessages}`);
  }

  return validatedConfig;
}
