import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chat } from './entities/chat.entity';
import { ChatMember } from './entities/chat-member.entity';
import { Message } from '../messages/entities/message.entity';
import { UsersModule } from '../users/users.module';
import { MessagesModule } from '../messages/messages.module';
import { ChatsService } from './chats.service';
import { ChatsController } from './chats.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, ChatMember, Message]),
    UsersModule,
    forwardRef(() => MessagesModule),
  ],
  controllers: [ChatsController],
  providers: [ChatsService],
  exports: [ChatsService],
})
export class ChatsModule {}
