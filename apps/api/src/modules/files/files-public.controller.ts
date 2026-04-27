import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { FilesService, type DownloadKind } from './files.service';

@ApiTags('Files')
@Controller('files')
export class FilesPublicController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':id/raw')
  async streamFile(
    @Param('id') id: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    await this.streamWithKind(id, token, 'file', res, true);
  }

  @Get(':id/thumbnail')
  async streamThumbnail(
    @Param('id') id: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    await this.streamWithKind(id, token, 'thumbnail', res, false);
  }

  private async streamWithKind(
    id: string,
    token: string,
    kind: DownloadKind,
    res: Response,
    asAttachment: boolean,
  ) {
    if (!token) throw new BadRequestException('Missing token');
    const payload = this.filesService.verifyDownloadToken(token);
    if (payload.fileId !== id || payload.kind !== kind) {
      throw new BadRequestException('Token does not match requested file');
    }

    const { object, filename } = await this.filesService.openFileStream(id, kind);

    res.setHeader('Content-Type', object.contentType);
    if (object.contentLength > 0) {
      res.setHeader('Content-Length', object.contentLength.toString());
    }
    res.setHeader('Cache-Control', 'private, max-age=3600');
    if (asAttachment) {
      const safeName = encodeURIComponent(filename).replace(/['()]/g, escape);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${safeName}`,
      );
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }

    object.stream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).send('Storage stream error');
      } else {
        res.destroy(err);
      }
    });

    object.stream.pipe(res);
  }
}
