import { Module } from '@nestjs/common';
import { WorkspaceAccessService } from './workspace-access.service';

@Module({ providers: [WorkspaceAccessService], exports: [WorkspaceAccessService] })
export class WorkspaceModule {}
