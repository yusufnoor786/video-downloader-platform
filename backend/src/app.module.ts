import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyzeController } from './modules/analyze/analyze.controller';
import { AnalyzeService } from './modules/analyze/analyze.service';
import { DownloadController } from './modules/download/download.controller';
import { DownloadService } from './modules/download/download.service';
import { HealthController } from './modules/health/health.controller';
import { HealthService } from './modules/health/health.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AnalyzeController, DownloadController, HealthController],
  providers: [AnalyzeService, DownloadService, HealthService],
})
export class AppModule {}
