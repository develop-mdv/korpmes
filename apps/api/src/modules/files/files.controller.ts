import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FilesService } from './files.service';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string },
    @Query('orgId') orgId: string,
    @Query('messageId') messageId?: string,
  ) {
    return this.filesService.upload(file, user.id, orgId, messageId);
  }

  @Get(':id')
  async getFileInfo(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    const file = await this.filesService.findById(id);
    const [signedUrl, thumbnailUrl] = await Promise.all([
      this.filesService.getDownloadUrl(id, user.id),
      this.filesService.getThumbnailUrl(id),
    ]);
    return { ...file, signedUrl, thumbnailUrl };
  }

  @Get(':id/download')
  async getDownloadUrl(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    const url = await this.filesService.getDownloadUrl(id, user.id);
    return { url };
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.filesService.delete(id, user.id);
    return { deleted: true };
  }

  @Get()
  async listFiles(
    @Query('chatId') chatId?: string,
    @Query('taskId') taskId?: string,
    @Query('orgId') orgId?: string,
  ) {
    if (chatId) {
      return this.filesService.findByChat(chatId);
    }
    if (taskId) {
      return this.filesService.findByTask(taskId);
    }
    if (orgId) {
      return this.filesService.findByOrg(orgId);
    }
    return [];
  }
}
