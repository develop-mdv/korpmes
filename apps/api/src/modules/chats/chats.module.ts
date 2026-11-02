import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chat } from './entities/chat.entity';
import { ChatMember } from './entities/chat-member.entity';
import { Message } from '../messages/entities/message.entity';
import { UsersModule } from '../users/users.module';
import { MessagesModule } from '../messages/messages.module';
import { ChatsService } from './chats.service';
import { ChatsController } from './chats.controller';
import { WorkspaceModule } from '../../common/workspace/workspace.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, ChatMember, Message]),
    UsersModule,
    WorkspaceModule,
    forwardRef(() => MessagesModule),
    forwardRef(() => WebSocketModule),
  ],
  controllers: [ChatsController],
  providers: [ChatsService],
  exports: [ChatsService],
})
export class ChatsModule {}
