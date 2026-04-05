import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallStatus } from '@corp/shared-types';
import { Call } from './entities/call.entity';
import { CallParticipant } from './entities/call-participant.entity';
import { InitiateCallDto } from './dto/initiate-call.dto';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    @InjectRepository(CallParticipant)
    private readonly participantRepository: Repository<CallParticipant>,
  ) {}

  async initiate(userId: string, dto: InitiateCallDto): Promise<Call> {
    const call = this.callRepository.create({
      chatId: dto.chatId,
      initiatedBy: userId,
      type: dto.type,
      status: CallStatus.RINGING,
    });

    const savedCall = await this.callRepository.save(call);

    const participant = this.participantRepository.create({
      callId: savedCall.id,
      userId,
    });
    await this.participantRepository.save(participant);

    return this.getById(savedCall.id);
  }

  async answer(callId: string, userId: string): Promise<Call> {
    const call = await this.getById(callId);

    if (call.status !== CallStatus.RINGING) {
      throw new BadRequestException('Call is not in RINGING state');
    }

    call.status = CallStatus.ACTIVE;
    call.startedAt = new Date();
    await this.callRepository.save(call);

    const existingParticipant = await this.participantRepository.findOne({
      where: { callId, userId },
    });

    if (!existingParticipant) {
      const participant = this.participantRepository.create({
        callId,
        userId,
      });
      await this.participantRepository.save(participant);
    }

    return this.getById(callId);
  }

  async reject(callId: string, userId: string): Promise<Call> {
    const call = await this.getById(callId);

    if (call.status !== CallStatus.RINGING) {
      throw new BadRequestException('Call is not in RINGING state');
    }

    const activeParticipants = call.participants.filter(
      (p) => !p.leftAt && p.userId !== call.initiatedBy,
    );

    if (activeParticipants.length === 0) {
      call.status = CallStatus.REJECTED;
      call.endedAt = new Date();
      await this.callRepository.save(call);
    }

    return this.getById(callId);
  }

  async hangup(callId: string, userId: string): Promise<Call> {
    const call = await this.getById(callId);

    const participant = await this.participantRepository.findOne({
      where: { callId, userId },
    });

    if (participant && !participant.leftAt) {
      participant.leftAt = new Date();
      await this.participantRepository.save(participant);
    }

    const remainingParticipants = await this.participantRepository.find({
      where: { callId },
    });
    const activeParticipants = remainingParticipants.filter((p) => !p.leftAt);

    if (activeParticipants.length === 0) {
      call.status = CallStatus.ENDED;
      call.endedAt = new Date();
      await this.callRepository.save(call);
    }

    return this.getById(callId);
  }

  async getById(callId: string): Promise<Call> {
    const call = await this.callRepository.findOne({
      where: { id: callId },
      relations: ['participants'],
    });

    if (!call) {
      throw new NotFoundException(`Call with id "${callId}" not found`);
    }

    return call;
  }

  async getHistory(chatId: string): Promise<Call[]> {
    return this.callRepository.find({
      where: { chatId },
      relations: ['participants'],
      order: { createdAt: 'DESC' },
    });
  }

  async getHistoryForUser(userId: string, limit = 50): Promise<Call[]> {
    return this.callRepository
      .createQueryBuilder('call')
      .innerJoin(
        'call.participants',
        'participant',
        'participant.userId = :userId',
        { userId },
      )
      .leftJoinAndSelect('call.participants', 'allParticipants')
      .orderBy('call.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }
}
