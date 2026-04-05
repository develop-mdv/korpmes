import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TaskStatus } from '@corp/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(user.id, dto);
  }

  @Get()
  async list(
    @Query('orgId') orgId: string,
    @Query('status') status?: TaskStatus,
    @Query('assignedTo') assignedTo?: string,
    @Query('chatId') chatId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tasksService.findByOrg(
      orgId,
      { status, assignedTo, chatId },
      { page: page ? parseInt(page, 10) : undefined, limit: limit ? parseInt(limit, 10) : undefined },
    );
  }

  @Get('my')
  async myTasks(
    @CurrentUser() user: { id: string },
    @Query('orgId') orgId: string,
  ) {
    const [assigned, created, watching] = await Promise.all([
      this.tasksService.findByUser(user.id, orgId, 'assigned'),
      this.tasksService.findByUser(user.id, orgId, 'created'),
      this.tasksService.findByUser(user.id, orgId, 'watching'),
    ]);
    return { assigned, created, watching };
  }

  @Get(':id')
  async getTask(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, user.id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.tasksService.remove(id);
    return { deleted: true };
  }

  @Patch(':id/assign')
  async assign(
    @Param('id') id: string,
    @Body() body: { assignedTo: string | null },
  ) {
    return this.tasksService.assign(id, body.assignedTo);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { content: string },
  ) {
    return this.tasksService.addComment(id, user.id, body.content);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    return this.tasksService.getComments(id);
  }
}
