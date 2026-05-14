import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { FilesService, type DownloadKind } from './files.service';

@ApiTags('Files')
@Controller('files')
export class FilesPublicController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':id/raw')
  async streamFile(
    @Param('id') id: string,
    @Query('token') token: string,
    @Query('inline') inline: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.streamWithKind(id, token, 'file', req, res, inline !== '1');
  }

  @Get(':id/thumbnail')
  async streamThumbnail(
    @Param('id') id: string,
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.streamWithKind(id, token, 'thumbnail', req, res, false);
  }

  private parseRange(
    header: string | undefined,
    totalSize: number,
  ): { start: number; end: number } | 'invalid' | null {
    if (!header) return null;
    const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
    if (!match) return 'invalid';
    const startStr = match[1];
    const endStr = match[2];
    if (startStr === '' && endStr === '') return 'invalid';
    let start: number;
    let end: number;
    if (startStr === '') {
      // Suffix range: bytes=-N → last N bytes
      const suffix = parseInt(endStr, 10);
      if (!Number.isFinite(suffix) || suffix <= 0) return 'invalid';
      start = Math.max(0, totalSize - suffix);
      end = totalSize - 1;
    } else {
      start = parseInt(startStr, 10);
      end = endStr ? parseInt(endStr, 10) : totalSize - 1;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 'invalid';
    if (start < 0 || start >= totalSize || end < start) return 'invalid';
    if (end >= totalSize) end = totalSize - 1;
    return { start, end };
  }

  private async streamWithKind(
    id: string,
    token: string,
    kind: DownloadKind,
    req: Request,
    res: Response,
    asAttachment: boolean,
  ) {
    if (!token) throw new BadRequestException('Missing token');
    const payload = this.filesService.verifyDownloadToken(token);
    if (payload.fileId !== id || payload.kind !== kind) {
      throw new BadRequestException('Token does not match requested file');
    }

    const { stat, filename } = await this.filesService.statFile(id, kind);
    const totalSize = stat.contentLength;
    const parsed = this.parseRange(req.headers.range, totalSize);

    if (parsed === 'invalid') {
      res.status(416);
      res.setHeader('Content-Range', `bytes */${totalSize}`);
      res.end();
      return;
    }

    res.setHeader('Content-Type', stat.contentType);
    res.setHeader('Accept-Ranges', 'bytes');
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

    let status = 200;
    let storageRange: { start: number; length: number } | undefined;
    let contentLength = totalSize;
    if (parsed) {
      const { start, end } = parsed;
      contentLength = end - start + 1;
      storageRange = { start, length: contentLength };
      status = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
    }

    if (contentLength > 0) {
      res.setHeader('Content-Length', contentLength.toString());
    }
    res.status(status);

    const { object } = await this.filesService.openFileStream(id, kind, storageRange);

    object.stream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).send('Storage stream error');
      } else {
        res.destroy(err);
      }
    });
    req.on('close', () => {
      object.stream.destroy();
    });

    object.stream.pipe(res);
  }
}
