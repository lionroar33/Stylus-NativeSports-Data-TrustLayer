/**
 * WebSocket Gateway - Real-Time Match Updates
 * Phase 4: WebSocket implementation for live scoring
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisService } from '../../../shared/redis/redis.service';

interface MatchRoom {
  matchId: string;
  spectators: Set<string>;
}

interface ClientData {
  clientId: string;
  matchRooms: Set<string>;
  joinedAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/match',
})
export class MatchGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MatchGateway.name);
  private matchRooms: Map<string, MatchRoom> = new Map();
  private clients: Map<string, ClientData> = new Map();

  constructor(private readonly redisService: RedisService) {}

  afterInit(server: Server): void {
    this.logger.log('WebSocket Gateway initialized');

    // Subscribe to Redis channels for cross-instance communication
    this.setupRedisSubscriptions();
  }

  private async setupRedisSubscriptions(): Promise<void> {
    // Subscribe to all match events
    await this.redisService.psubscribe('match:*', (message, channel) => {
      try {
        const data = JSON.parse(message);
        const matchId = channel.split(':')[1];
        this.broadcastToMatch(matchId, data.event, data.payload);
      } catch (err) {
        this.logger.error(`Error processing Redis message: ${err}`);
      }
    });
  }

  // ============================================
  // Connection Lifecycle
  // ============================================

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);

    this.clients.set(client.id, {
      clientId: client.id,
      matchRooms: new Set(),
      joinedAt: new Date(),
    });

    client.emit('connected', {
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);

    const clientData = this.clients.get(client.id);
    if (clientData) {
      // Remove from all match rooms
      clientData.matchRooms.forEach(matchId => {
        this.leaveMatchRoom(client, matchId);
      });
      this.clients.delete(client.id);
    }
  }

  // ============================================
  // Match Room Management
  // ============================================

  @SubscribeMessage('join:match')
  handleJoinMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string }
  ): void {
    const { matchId } = data;
    const roomName = `match:${matchId}`;

    // Join Socket.IO room
    client.join(roomName);

    // Track in our maps
    let room = this.matchRooms.get(matchId);
    if (!room) {
      room = { matchId, spectators: new Set() };
      this.matchRooms.set(matchId, room);
    }
    room.spectators.add(client.id);

    const clientData = this.clients.get(client.id);
    if (clientData) {
      clientData.matchRooms.add(matchId);
    }

    this.logger.log(`Client ${client.id} joined match ${matchId}`);

    // Acknowledge join
    client.emit('joined:match', {
      matchId,
      spectatorCount: room.spectators.size,
      timestamp: new Date().toISOString(),
    });

    // Notify others
    client.to(roomName).emit('spectator:joined', {
      matchId,
      spectatorCount: room.spectators.size,
    });
  }

  @SubscribeMessage('leave:match')
  handleLeaveMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string }
  ): void {
    this.leaveMatchRoom(client, data.matchId);

    client.emit('left:match', {
      matchId: data.matchId,
      timestamp: new Date().toISOString(),
    });
  }

  private leaveMatchRoom(client: Socket, matchId: string): void {
    const roomName = `match:${matchId}`;
    client.leave(roomName);

    const room = this.matchRooms.get(matchId);
    if (room) {
      room.spectators.delete(client.id);
      if (room.spectators.size === 0) {
        this.matchRooms.delete(matchId);
      } else {
        // Notify remaining spectators
        this.server.to(roomName).emit('spectator:left', {
          matchId,
          spectatorCount: room.spectators.size,
        });
      }
    }

    const clientData = this.clients.get(client.id);
    if (clientData) {
      clientData.matchRooms.delete(matchId);
    }
  }

  // ============================================
  // Event Broadcasting
  // ============================================

  /**
   * Broadcast event to all spectators in a match room
   */
  broadcastToMatch(matchId: string, event: string, payload: any): void {
    const roomName = `match:${matchId}`;
    this.server.to(roomName).emit(event, {
      ...payload,
      matchId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Publish event to Redis for cross-instance broadcasting
   */
  async publishMatchEvent(matchId: string, event: string, payload: any): Promise<void> {
    await this.redisService.publish(`match:${matchId}`, {
      event,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // Event Listeners (from Cricket Scoring Engine)
  // ============================================

  @OnEvent('ball.bowled')
  async handleBallBowled(data: { matchId: string; event: any; innings: any }): Promise<void> {
    const { matchId, event, innings } = data;

    // Broadcast score update
    this.broadcastToMatch(matchId, 'scoreUpdate', {
      over: `${innings.overs}.${innings.balls}`,
      score: `${innings.totalRuns}/${innings.wickets}`,
      runRate: innings.runRate?.toFixed(2),
      lastBall: {
        runs: event.payload.runsScored,
        extras: event.payload.extras,
        isWicket: event.payload.wicket.isWicket,
        isBoundary: event.payload.isBoundary,
        isSix: event.payload.isSix,
      },
    });

    // Publish to Redis for cross-instance
    await this.publishMatchEvent(matchId, 'scoreUpdate', {
      innings,
      event: event.id,
    });

    // Cache latest state
    await this.redisService.setMatchState(matchId, innings);
  }

  @OnEvent('innings.started')
  handleInningsStarted(data: { matchId: string; inningsNumber: number; battingTeamId: string }): void {
    this.broadcastToMatch(data.matchId, 'inningsStarted', {
      inningsNumber: data.inningsNumber,
      battingTeam: data.battingTeamId,
    });
  }

  @OnEvent('innings.ended')
  handleInningsEnded(data: { matchId: string; inningsNumber: number }): void {
    this.broadcastToMatch(data.matchId, 'inningsEnded', {
      inningsNumber: data.inningsNumber,
    });
  }

  @OnEvent('match.ended')
  handleMatchEnded(data: { matchId: string; result: string }): void {
    this.broadcastToMatch(data.matchId, 'matchEnded', {
      result: data.result,
    });
  }

  @OnEvent('token.rewards')
  handleTokenRewards(data: { matchId: string; rewards: any[] }): void {
    this.broadcastToMatch(data.matchId, 'tokenRewards', {
      rewards: data.rewards,
    });
  }

  // ============================================
  // Utility Methods
  // ============================================

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  @SubscribeMessage('get:spectatorCount')
  handleGetSpectatorCount(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string }
  ): void {
    const room = this.matchRooms.get(data.matchId);
    client.emit('spectatorCount', {
      matchId: data.matchId,
      count: room?.spectators.size || 0,
    });
  }

  /**
   * Get all active matches with spectator counts
   */
  getActiveMatches(): { matchId: string; spectatorCount: number }[] {
    return Array.from(this.matchRooms.entries()).map(([matchId, room]) => ({
      matchId,
      spectatorCount: room.spectators.size,
    }));
  }

  /**
   * Get connected client count
   */
  getConnectedClientCount(): number {
    return this.clients.size;
  }
}
