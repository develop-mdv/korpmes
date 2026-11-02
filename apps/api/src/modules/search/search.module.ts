import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { WorkspaceModule } from '../../common/workspace/workspace.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [WorkspaceModule, UsersModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
