import { ForbiddenException, Inject, Injectable, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, LessThan, Not } from 'typeorm';
import { TaskStatus } from '@corp/shared-types';
import { WS_EVENTS } from '@corp/shared-constants';
import { Task } from './entities/task.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskChecklistItem } from './entities/task-checklist-item.entity';
import { File } from '../files/entities/file.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  CreateChecklistItemDto,
  UpdateChecklistItemDto,
} from './dto/checklist.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WebSocketService } from '../websocket/websocket.service';
import { MembersService } from '../organizations/members.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskComment)
    private readonly commentRepository: Repository<TaskComment>,
    @InjectRepository(TaskChecklistItem)
    private readonly checklistRepository: Repository<TaskChecklistItem>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly wsService: WebSocketService,
    @Inject(forwardRef(() => MembersService))
    private readonly membersService: MembersService,
  ) {}

  private async assertMember(orgId: string, userId: string): Promise<void> {
    const member = await this.membersService.getMember(orgId, userId);
    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }
  }

  async create(userId: string, dto: CreateTaskDto): Promise<Task> {
    await this.assertMember(dto.organizationId, userId);
    const task = this.taskRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      priority: dto.priority,
      organizationId: dto.organizationId,
      chatId: dto.chatId ?? null,
      assignedTo: dto.assignedTo ?? null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      createdBy: userId,
    });

    const savedTask = await this.taskRepository.save(task);

    if (dto.watcherIds && dto.watcherIds.length > 0) {
      await this.taskRepository
        .createQueryBuilder()
        .relation(Task, 'watchers')
        .of(savedTask.id)
        .add(dto.watcherIds);
    }

    const full = await this.findById(savedTask.id);

    this.auditService.log({
      userId,
      organizationId: savedTask.organizationId,
      action: 'task.create',
      entityType: 'task',
      entityId: savedTask.id,
      metadata: { title: savedTask.title, priority: savedTask.priority },
    });

    this.wsService.emitToOrg(savedTask.organizationId, WS_EVENTS.TASK_CREATED, full);

    if (dto.assignedTo && dto.assignedTo !== userId) {
      this.notifyAssignment(dto.assignedTo, full).catch((err) =>
        this.logger.warn(`assignment notification failed: ${err.message}`),
      );
    }

    return full;
  }

  async findById(id: string, actorId?: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['createdByUser', 'assignedToUser', 'watchers'],
    });

    if (!task) {
      throw new NotFoundException(`Task with id "${id}" not found`);
    }

    if (actorId) {
      await this.assertMember(task.organizationId, actorId);
    }

    return task;
  }

  async findByOrg(
    orgId: string,
    actorId: string,
    filters?: { status?: TaskStatus; priority?: string; assignedTo?: string; chatId?: string },
    pagination?: { page?: number; limit?: number },
  ): Promise<{ items: Task[]; total: number }> {
    await this.assertMember(orgId, actorId);
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;

    const where: Record<string, unknown> = { organizationId: orgId };
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters?.chatId) where.chatId = filters.chatId;

    const [items, total] = await this.taskRepository.findAndCount({
      where,
      relations: ['createdByUser', 'assignedToUser'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  async findByUser(
    userId: string,
    orgId: string,
    role: 'assigned' | 'created' | 'watching',
  ): Promise<Task[]> {
    await this.assertMember(orgId, userId);
    if (role === 'assigned') {
      return this.taskRepository.find({
        where: { assignedTo: userId, organizationId: orgId },
        relations: ['createdByUser', 'assignedToUser'],
        order: { createdAt: 'DESC' },
      });
    }

    if (role === 'created') {
      return this.taskRepository.find({
        where: { createdBy: userId, organizationId: orgId },
        relations: ['createdByUser', 'assignedToUser'],
        order: { createdAt: 'DESC' },
      });
    }

    return this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.createdByUser', 'creator')
      .leftJoinAndSelect('task.assignedToUser', 'assignee')
      .innerJoin('task.watchers', 'watcher', 'watcher.id = :userId', {
        userId,
      })
      .where('task.organization_id = :orgId', { orgId })
      .orderBy('task.created_at', 'DESC')
      .getMany();
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateTaskDto,
  ): Promise<Task> {
    const task = await this.findById(id, userId);
    const previousAssignee = task.assignedTo;

    const changes: Record<string, unknown> = {};

    if (dto.title !== undefined) {
      changes.title = { from: task.title, to: dto.title };
      task.title = dto.title;
    }
    if (dto.description !== undefined) {
      task.description = dto.description ?? null;
      changes.description = true;
    }
    if (dto.priority !== undefined) {
      changes.priority = { from: task.priority, to: dto.priority };
      task.priority = dto.priority;
    }
    if (dto.assignedTo !== undefined) {
      changes.assignedTo = { from: task.assignedTo, to: dto.assignedTo ?? null };
      task.assignedTo = dto.assignedTo ?? null;
    }
    if (dto.dueDate !== undefined) {
      task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      changes.dueDate = task.dueDate?.toISOString() ?? null;
    }

    if (dto.status !== undefined) {
      const previousStatus = task.status;
      changes.status = { from: previousStatus, to: dto.status };
      task.status = dto.status;

      if (dto.status === TaskStatus.DONE && previousStatus !== TaskStatus.DONE) {
        task.completedAt = new Date();
      } else if (
        dto.status !== TaskStatus.DONE &&
        previousStatus === TaskStatus.DONE
      ) {
        task.completedAt = null;
      }
    }

    if (dto.watcherIds !== undefined) {
      const currentWatcherIds = task.watchers.map((w: any) => w.id);
      const toAdd = dto.watcherIds.filter(
        (id) => !currentWatcherIds.includes(id),
      );
      const toRemove = currentWatcherIds.filter(
        (id: string) => !dto.watcherIds!.includes(id),
      );

      if (toRemove.length > 0) {
        await this.taskRepository
          .createQueryBuilder()
          .relation(Task, 'watchers')
          .of(task.id)
          .remove(toRemove);
      }
      if (toAdd.length > 0) {
        await this.taskRepository
          .createQueryBuilder()
          .relation(Task, 'watchers')
          .of(task.id)
          .add(toAdd);
      }
      changes.watchers = { added: toAdd.length, removed: toRemove.length };
    }

    await this.taskRepository.save(task);
    const full = await this.findById(id);

    this.auditService.log({
      userId,
      organizationId: task.organizationId,
      action: 'task.update',
      entityType: 'task',
      entityId: task.id,
      metadata: changes,
    });

    this.wsService.emitToOrg(task.organizationId, WS_EVENTS.TASK_UPDATED, full);

    if (
      dto.assignedTo !== undefined &&
      dto.assignedTo &&
      dto.assignedTo !== previousAssignee &&
      dto.assignedTo !== userId
    ) {
      this.notifyAssignment(dto.assignedTo, full).catch((err) =>
        this.logger.warn(`assignment notification failed: ${err.message}`),
      );
    }

    return full;
  }

  async assign(id: string, assignedTo: string | null, actorId: string): Promise<Task> {
    const task = await this.findById(id, actorId);
    const previousAssignee = task.assignedTo;
    task.assignedTo = assignedTo;
    await this.taskRepository.save(task);
    const full = await this.findById(id);

    this.auditService.log({
      userId: actorId,
      organizationId: task.organizationId,
      action: 'task.assign',
      entityType: 'task',
      entityId: task.id,
      metadata: { from: previousAssignee, to: assignedTo },
    });

    this.wsService.emitToOrg(task.organizationId, WS_EVENTS.TASK_UPDATED, full);

    if (assignedTo && assignedTo !== previousAssignee && assignedTo !== actorId) {
      this.notifyAssignment(assignedTo, full).catch((err) =>
        this.logger.warn(`assignment notification failed: ${err.message}`),
      );
    }

    return full;
  }

  async remove(id: string, actorId: string): Promise<void> {
    const task = await this.findById(id, actorId);

    await this.fileRepository.update({ taskId: id }, { taskId: null });

    await this.taskRepository.remove(task);

    this.auditService.log({
      userId: actorId,
      organizationId: task.organizationId,
      action: 'task.delete',
      entityType: 'task',
      entityId: id,
      metadata: { title: task.title },
    });

    this.wsService.emitToOrg(task.organizationId, WS_EVENTS.TASK_DELETED, { id });
  }

  async addComment(
    taskId: string,
    userId: string,
    content: string,
  ): Promise<TaskComment> {
    const task = await this.findById(taskId, userId);
    const comment = this.commentRepository.create({
      taskId,
      userId,
      content,
    });
    const saved = await this.commentRepository.save(comment);

    this.auditService.log({
      userId,
      organizationId: task.organizationId,
      action: 'task.comment.add',
      entityType: 'task',
      entityId: taskId,
      metadata: { commentId: saved.id },
    });

    return saved;
  }

  async getComments(taskId: string, actorId: string): Promise<TaskComment[]> {
    await this.findById(taskId, actorId);
    return this.commentRepository.find({
      where: { taskId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async getOverdueTasks(orgId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: {
        organizationId: orgId,
        dueDate: LessThan(new Date()),
        status: Not(In([TaskStatus.DONE, TaskStatus.CANCELLED])),
      },
      relations: ['createdByUser', 'assignedToUser'],
      order: { dueDate: 'ASC' },
    });
  }

  // ─── Checklists ─────────────────────────────────────────────────────────────

  async getChecklist(taskId: string, actorId: string): Promise<TaskChecklistItem[]> {
    await this.findById(taskId, actorId);
    return this.checklistRepository.find({
      where: { taskId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  async addChecklistItem(
    taskId: string,
    userId: string,
    dto: CreateChecklistItemDto,
  ): Promise<TaskChecklistItem> {
    const task = await this.findById(taskId, userId);
    const max = await this.checklistRepository
      .createQueryBuilder('item')
      .where('item.task_id = :taskId', { taskId })
      .select('COALESCE(MAX(item.position), -1)', 'max')
      .getRawOne<{ max: number }>();

    const item = this.checklistRepository.create({
      taskId,
      title: dto.title,
      isDone: false,
      position: (max?.max ?? -1) + 1,
    });
    const saved = await this.checklistRepository.save(item);

    this.auditService.log({
      userId,
      organizationId: task.organizationId,
      action: 'task.checklist.add',
      entityType: 'task',
      entityId: taskId,
      metadata: { itemId: saved.id },
    });

    this.wsService.emitToOrg(task.organizationId, WS_EVENTS.TASK_UPDATED, await this.findById(taskId));

    return saved;
  }

  async updateChecklistItem(
    itemId: string,
    userId: string,
    dto: UpdateChecklistItemDto,
  ): Promise<TaskChecklistItem> {
    const item = await this.checklistRepository.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException(`Checklist item "${itemId}" not found`);

    await this.findById(item.taskId, userId);

    if (dto.title !== undefined) item.title = dto.title;
    if (dto.isDone !== undefined) item.isDone = dto.isDone;
    if (dto.position !== undefined) item.position = dto.position;

    const saved = await this.checklistRepository.save(item);
    const task = await this.findById(item.taskId);

    this.auditService.log({
      userId,
      organizationId: task.organizationId,
      action: 'task.checklist.update',
      entityType: 'task',
      entityId: item.taskId,
      metadata: { itemId, changes: dto },
    });

    this.wsService.emitToOrg(task.organizationId, WS_EVENTS.TASK_UPDATED, task);

    return saved;
  }

  async removeChecklistItem(itemId: string, userId: string): Promise<void> {
    const item = await this.checklistRepository.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException(`Checklist item "${itemId}" not found`);

    const taskId = item.taskId;
    await this.findById(taskId, userId);
    await this.checklistRepository.remove(item);
    const task = await this.findById(taskId);

    this.auditService.log({
      userId,
      organizationId: task.organizationId,
      action: 'task.checklist.remove',
      entityType: 'task',
      entityId: taskId,
      metadata: { itemId },
    });

    this.wsService.emitToOrg(task.organizationId, WS_EVENTS.TASK_UPDATED, task);
  }

  // ─── Attachments ────────────────────────────────────────────────────────────

  async getAttachments(taskId: string, actorId: string): Promise<File[]> {
    await this.findById(taskId, actorId);
    return this.fileRepository.find({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
  }

  async attachFile(taskId: string, fileId: string, userId: string): Promise<File> {
    const task = await this.findById(taskId, userId);
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException(`File "${fileId}" not found`);

    if (file.organizationId !== task.organizationId) {
      throw new NotFoundException(`File "${fileId}" not found`);
    }

    file.taskId = taskId;
    await this.fileRepository.save(file);

    this.auditService.log({
      userId,
      organizationId: task.organizationId,
      action: 'task.attachment.add',
      entityType: 'task',
      entityId: taskId,
      metadata: { fileId, fileName: file.originalName },
    });

    this.wsService.emitToOrg(task.organizationId, WS_EVENTS.TASK_UPDATED, task);

    return file;
  }

  async detachFile(taskId: string, fileId: string, userId: string): Promise<void> {
    const task = await this.findById(taskId, userId);
    const file = await this.fileRepository.findOne({ where: { id: fileId, taskId } });
    if (!file) throw new NotFoundException(`File "${fileId}" not attached to task`);

    file.taskId = null;
    await this.fileRepository.save(file);

    this.auditService.log({
      userId,
      organizationId: task.organizationId,
      action: 'task.attachment.remove',
      entityType: 'task',
      entityId: taskId,
      metadata: { fileId },
    });

    this.wsService.emitToOrg(task.organizationId, WS_EVENTS.TASK_UPDATED, task);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async notifyAssignment(assigneeId: string, task: Task): Promise<void> {
    const creatorName = task.createdByUser
      ? `${task.createdByUser.firstName ?? ''} ${task.createdByUser.lastName ?? ''}`.trim() ||
        task.createdByUser.email ||
        'Коллега'
      : 'Коллега';

    await this.notificationsService.create(
      assigneeId,
      'task.assigned',
      'Вам назначена задача',
      `${creatorName}: ${task.title}`,
      { taskId: task.id, organizationId: task.organizationId },
    );
  }
}
