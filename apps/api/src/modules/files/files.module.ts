import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { StorageService } from './storage/storage.service';
import { MinioStorageService } from './storage/minio-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([File])],
  controllers: [FilesController],
  providers: [
    FilesService,
    {
      provide: StorageService,
      useClass: MinioStorageService,
    },
  ],
  exports: [FilesService],
})
export class FilesModule {}
