import { Global, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { OrganizationsModule } from '../organizations/organizations.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    forwardRef(() => OrganizationsModule),
    forwardRef(() => WebSocketModule),
  ],
  providers: [AuditService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
