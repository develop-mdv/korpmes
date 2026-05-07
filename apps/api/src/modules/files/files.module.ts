import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { File } from './entities/file.entity';
import { Chat } from '../chats/entities/chat.entity';
import { Task } from '../tasks/entities/task.entity';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { FilesPublicController } from './files-public.controller';
import { StorageService } from './storage/storage.service';
import { MinioStorageService } from './storage/minio-storage.service';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([File, Chat, Task]),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => OrganizationsModule),
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
