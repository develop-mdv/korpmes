import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, Not } from 'typeorm';
import { TaskStatus } from '@corp/shared-types';
import { Task } from './entities/task.entity';
import { TaskComment } from './entities/task-comment.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskComment)
    private readonly commentRepository: Repository<TaskComment>,
  ) {}

  async create(userId: string, dto: CreateTaskDto): Promise<Task> {
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

    return this.findById(savedTask.id);
  }

  async findById(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['createdByUser', 'assignedToUser', 'watchers'],
    });

    if (!task) {
      throw new NotFoundException(`Task with id "${id}" not found`);
    }

    return task;
  }

  async findByOrg(
    orgId: string,
    filters?: { status?: TaskStatus; assignedTo?: string; chatId?: string },
    pagination?: { page?: number; limit?: number },
  ): Promise<{ items: Task[]; total: number }> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;

    const qb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.createdByUser', 'creator')
      .leftJoinAndSelect('task.assignedToUser', 'assignee')
      .where('task.organization_id = :orgId', { orgId });

    if (filters?.status) {
      qb.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters?.assignedTo) {
      qb.andWhere('task.assigned_to = :assignedTo', {
        assignedTo: filters.assignedTo,
      });
    }

    if (filters?.chatId) {
      qb.andWhere('task.chat_id = :chatId', { chatId: filters.chatId });
    }

    qb.orderBy('task.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findByUser(
    userId: string,
    orgId: string,
    role: 'assigned' | 'created' | 'watching',
  ): Promise<Task[]> {
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

    // watching
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
    const task = await this.findById(id);

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description ?? null;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.assignedTo !== undefined) task.assignedTo = dto.assignedTo ?? null;
    if (dto.dueDate !== undefined) {
      task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    if (dto.status !== undefined) {
      const previousStatus = task.status;
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
    }

    await this.taskRepository.save(task);
    return this.findById(id);
  }

  async assign(id: string, assignedTo: string | null): Promise<Task> {
    const task = await this.findById(id);
    task.assignedTo = assignedTo;
    await this.taskRepository.save(task);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    const task = await this.findById(id);
    await this.taskRepository.remove(task);
  }

  async addComment(
    taskId: string,
    userId: string,
    content: string,
  ): Promise<TaskComment> {
    await this.findById(taskId); // ensure task exists
    const comment = this.commentRepository.create({
      taskId,
      userId,
      content,
    });
    return this.commentRepository.save(comment);
  }

  async getComments(taskId: string): Promise<TaskComment[]> {
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
}
