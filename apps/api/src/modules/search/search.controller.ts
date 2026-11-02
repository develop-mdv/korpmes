import { BadRequestException, Controller, Get, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SearchScope } from '@corp/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query('q') query: string,
    @CurrentUser() user: { id: string },
    @Query('scope') scope: string = SearchScope.ALL,
    @Query('orgId', new ParseUUIDPipe({ optional: true })) orgId?: string,
    @Query('chatId', new ParseUUIDPipe({ optional: true })) chatId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const normalizedScope = scope.toUpperCase() === 'MEMBERS' ? SearchScope.USERS : scope.toUpperCase() as SearchScope;
    if (!Object.values(SearchScope).includes(normalizedScope)) throw new BadRequestException('Invalid search scope');
    if (!query?.trim() || query.length > 254) throw new BadRequestException('Search query must contain 1 to 254 characters');
    if (limit && (!/^\d+$/.test(limit) || Number(limit) < 1)) throw new BadRequestException('Invalid search limit');
    for (const date of [dateFrom, dateTo, cursor]) {
      if (date && !Number.isFinite(Date.parse(date))) throw new BadRequestException('Invalid search date');
    }
    return this.searchService.search({
      userId: user.id,
      query,
      scope: normalizedScope,
      orgId,
      chatId,
      dateFrom,
      dateTo,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
