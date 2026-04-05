import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SearchScope } from '@corp/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SearchService } from './search.service';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query('q') query: string,
    @Query('scope') scope: SearchScope = SearchScope.ALL,
    @Query('orgId') orgId: string,
    @Query('chatId') chatId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.search({
      query,
      scope,
      orgId,
      chatId,
      dateFrom,
      dateTo,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
