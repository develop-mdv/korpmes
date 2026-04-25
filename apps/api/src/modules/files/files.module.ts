import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { File } from './entities/file.entity';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { FilesPublicController } from './files-public.controller';
import { StorageService } from './storage/storage.service';
import { MinioStorageService } from './storage/minio-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([File]),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [FilesController, FilesPublicController],
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
