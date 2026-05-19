import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessagesModule } from '../messages/messages.module';
import { ChatsModule } from '../chats/chats.module';
import { RedisModule } from '../redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { WebSocketGatewayHandler } from './websocket.gateway';
import { WebSocketService } from './websocket.service';

@Module({
  imports: [
    forwardRef(() => MessagesModule),
    forwardRef(() => ChatsModule),
    RedisModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => OrganizationsModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_TTL', '15m'),
        },
      }),
    }),
  ],
  providers: [WebSocketGatewayHandler, WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}
