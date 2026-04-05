import { SelectQueryBuilder } from 'typeorm';
import { PaginationQueryDto, SortOrder } from '../dto/pagination.dto';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function buildPaginationQuery<T extends Record<string, any>>(
  queryBuilder: SelectQueryBuilder<T>,
  paginationDto: PaginationQueryDto,
): Promise<PaginatedResult<T>> {
  const { page, limit, sortBy, sortOrder } = paginationDto;

  const skip = (page - 1) * limit;
  queryBuilder.skip(skip).take(limit);

  if (sortBy) {
    const alias = queryBuilder.alias;
    const order = sortOrder || SortOrder.ASC;
    queryBuilder.orderBy(`${alias}.${sortBy}`, order);
  }

  const [items, total] = await queryBuilder.getManyAndCount();

  return {
    items,
    total,
    page,
    limit,
    hasMore: skip + items.length < total,
  };
}
