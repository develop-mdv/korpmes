import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token =
      client.handshake?.auth?.token ||
      this.extractTokenFromHeader(client.handshake?.headers?.authorization);

    if (!token) {
      throw new WsException('Authentication token not provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      client.data = { user: payload };
      return true;
    } catch {
      throw new WsException('Invalid authentication token');
    }
  }

  private extractTokenFromHeader(authorization?: string): string | null {
    if (!authorization) return null;
    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
