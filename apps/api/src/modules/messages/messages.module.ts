import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { MessageStatus } from './entities/message-status.entity';
import { Reaction } from './entities/reaction.entity';
import { File } from '../files/entities/file.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatsModule } from '../chats/chats.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageStatus, Reaction, File]),
    forwardRef(() => NotificationsModule),
    forwardRef(() => ChatsModule),
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
