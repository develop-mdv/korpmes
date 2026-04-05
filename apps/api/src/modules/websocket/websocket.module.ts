import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessagesModule } from '../messages/messages.module';
import { ChatsModule } from '../chats/chats.module';
import { RedisModule } from '../redis/redis.module';
import { WebSocketGatewayHandler } from './websocket.gateway';
import { WebSocketService } from './websocket.service';

@Module({
  imports: [
    MessagesModule,
    ChatsModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
        },
      }),
    }),
  ],
  providers: [WebSocketGatewayHandler, WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}
