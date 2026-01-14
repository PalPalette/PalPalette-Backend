import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { AnalyticsService } from "./analytics.service";
import {
  UserAnalyticsExportDto,
  AggregateAnalyticsExportDto,
} from "./dto/analytics-export.dto";

@ApiTags("Analytics")
@Controller("analytics")
@Public()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("export/user/:userId")
  @ApiOperation({
    summary: "Export analytics for a specific user",
    description:
      "Export anonymized message data for a single user. User IDs are anonymized consistently within the export. Supports JSON and CSV formats.",
  })
  @ApiParam({
    name: "userId",
    description: "User ID to export analytics for",
    example: "uuid-string",
  })
  @ApiQuery({
    name: "format",
    description: "Export format",
    enum: ["json", "csv"],
    required: false,
    example: "json",
  })
  @ApiQuery({
    name: "dateFrom",
    description: "Start date for filtering (ISO 8601 format)",
    required: false,
    example: "2025-01-01T00:00:00Z",
  })
  @ApiQuery({
    name: "dateTo",
    description: "End date for filtering (ISO 8601 format)",
    required: false,
    example: "2025-12-31T23:59:59Z",
  })
  @ApiResponse({
    status: 200,
    description: "Analytics exported successfully",
    type: UserAnalyticsExportDto,
  })
  @ApiResponse({ status: 400, description: "Bad request - invalid parameters" })
  @ApiResponse({ status: 404, description: "User not found" })
  async exportUserAnalytics(
    @Param("userId") userId: string,
    @Query("format") format: string = "json",
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Res({ passthrough: true }) res?: Response
  ) {
    // Validate format
    if (format !== "json" && format !== "csv") {
      throw new BadRequestException('Format must be either "json" or "csv"');
    }

    // Validate dates if provided
    if (dateFrom && isNaN(Date.parse(dateFrom))) {
      throw new BadRequestException(
        "Invalid dateFrom format. Use ISO 8601 format."
      );
    }
    if (dateTo && isNaN(Date.parse(dateTo))) {
      throw new BadRequestException(
        "Invalid dateTo format. Use ISO 8601 format."
      );
    }

    const data = await this.analyticsService.exportUserAnalytics(
      userId,
      format as "json" | "csv",
      dateFrom,
      dateTo
    );

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="user_${userId}_analytics.csv"`
      );
      return res.send(data);
    }

    return data;
  }

  @Get("export/aggregate")
  @ApiOperation({
    summary: "Export aggregate analytics for all users",
    description:
      "Export anonymized analytics data for all users. All user IDs are anonymized consistently within the export. Supports JSON and CSV formats.",
  })
  @ApiQuery({
    name: "format",
    description: "Export format",
    enum: ["json", "csv"],
    required: false,
    example: "json",
  })
  @ApiQuery({
    name: "dateFrom",
    description: "Start date for filtering (ISO 8601 format)",
    required: false,
    example: "2025-01-01T00:00:00Z",
  })
  @ApiQuery({
    name: "dateTo",
    description: "End date for filtering (ISO 8601 format)",
    required: false,
    example: "2025-12-31T23:59:59Z",
  })
  @ApiQuery({
    name: "includeMessages",
    description:
      "Include full message data in JSON export (always included in CSV)",
    required: false,
    example: "true",
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: "Aggregate analytics exported successfully",
    type: AggregateAnalyticsExportDto,
  })
  @ApiResponse({ status: 400, description: "Bad request - invalid parameters" })
  async exportAggregateAnalytics(
    @Query("format") format: string = "json",
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("includeMessages") includeMessages?: string,
    @Res({ passthrough: true }) res?: Response
  ) {
    // Validate format
    if (format !== "json" && format !== "csv") {
      throw new BadRequestException('Format must be either "json" or "csv"');
    }

    // Validate dates if provided
    if (dateFrom && isNaN(Date.parse(dateFrom))) {
      throw new BadRequestException(
        "Invalid dateFrom format. Use ISO 8601 format."
      );
    }
    if (dateTo && isNaN(Date.parse(dateTo))) {
      throw new BadRequestException(
        "Invalid dateTo format. Use ISO 8601 format."
      );
    }

    const includeMessagesFlag = includeMessages === "true";

    const data = await this.analyticsService.exportAggregateAnalytics(
      format as "json" | "csv",
      dateFrom,
      dateTo,
      includeMessagesFlag
    );

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="aggregate_analytics.csv"`
      );
      return res.send(data);
    }

    return data;
  }
}
