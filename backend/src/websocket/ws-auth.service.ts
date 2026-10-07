import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { AUTH_COOKIE, RequestUser } from '../auth/types';

@Injectable()
export class WsAuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async authenticate(socket: Socket): Promise<RequestUser> {
    const cookieHeader = socket.handshake.headers.cookie ?? '';
    const tokenFromAuth = socket.handshake.auth?.token as string | undefined;
    const token =
      tokenFromAuth ||
      this.parseCookie(cookieHeader, AUTH_COOKIE) ||
      (socket.handshake.headers.authorization?.replace('Bearer ', '') ?? null);

    if (!token) {
      throw new UnauthorizedException('Missing auth token');
    }

    let payload: { sub: string; email: string };
    try {
      payload = this.jwt.verify(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private parseCookie(header: string, name: string): string | null {
    const match = header
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`));
    if (!match) return null;
    return decodeURIComponent(match.slice(name.length + 1));
  }
}
