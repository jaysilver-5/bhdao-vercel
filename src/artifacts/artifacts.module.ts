import { Module } from '@nestjs/common';
import { ArtifactsController } from './artifacts.controller';
import { ArtifactsService } from './artifacts.service';
import { UploadService } from './upload.service';

@Module({
  controllers: [ArtifactsController],
  providers: [ArtifactsService, UploadService],
  exports: [ArtifactsService, UploadService],
})
export class ArtifactsModule {}