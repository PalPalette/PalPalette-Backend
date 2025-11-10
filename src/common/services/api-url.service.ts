import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ApiUrlService {
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    // Use internal container communication in production, localhost in development
    this.baseUrl =
      this.configService.get<string>("NODE_ENV") === "production"
        ? "http://backend:3000" // Internal Docker network
        : "http://localhost:3000"; // Development
  }

  getDevicesApiUrl(deviceId?: string, endpoint?: string): string {
    let url = `${this.baseUrl}/devices`;

    if (deviceId) {
      url += `/${deviceId}`;
    }

    if (endpoint) {
      url += `/${endpoint}`;
    }

    return url;
  }

  getApiUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }
}
